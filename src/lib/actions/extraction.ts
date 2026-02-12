"use server";

import { getAIClient, EXTRACTION_MODEL, withRetry } from "@/lib/gemini/client";
import { lookupEmdnViaEudamed } from "@/lib/gemini/eudamed-lookup";
import {
  extractedProductSchema,
  extractedProductJsonSchema,
  type ExtractedProduct,
} from "@/lib/schemas/extraction";

interface ExtractionResult {
  success: boolean;
  data?: ExtractedProduct;
  error?: string;
}

/**
 * Extract structured product data from an uploaded file.
 * Supports .txt, .md, and .pdf files.
 */
export async function extractFromProductSheet(
  formData: FormData
): Promise<ExtractionResult> {
  const file = formData.get("file") as File | null;

  if (!file) {
    return { success: false, error: "No file provided" };
  }

  const fileName = file.name.toLowerCase();

  // Handle PDF files
  if (fileName.endsWith(".pdf")) {
    return extractFromPdf(file);
  }

  // Handle text files
  if (fileName.endsWith(".txt") || fileName.endsWith(".md")) {
    const content = await file.text();
    if (content.length > 50000) {
      return { success: false, error: "File too large (max 50KB)" };
    }
    return extractFromContent(content);
  }

  return { success: false, error: "Unsupported file type. Use .txt, .md, or .pdf" };
}

/**
 * Extract structured product data from a PDF file.
 */
async function extractFromPdf(file: File): Promise<ExtractionResult> {
  try {
    // Dynamic import to avoid issues with pdf-parse in edge runtime
    const { PDFParse } = await import("pdf-parse");

    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    const parser = new PDFParse({ data });
    const textResult = await parser.getText();
    const content = textResult.text;
    await parser.destroy();

    if (!content || content.trim().length === 0) {
      return { success: false, error: "Could not extract text from PDF. The file may be image-based or empty." };
    }

    if (content.length > 100000) {
      return { success: false, error: "PDF content too large (max 100KB of text)" };
    }

    return extractFromContent(content);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to parse PDF file",
    };
  }
}

/**
 * Run AI extraction with retry, validation, and EUDAMED enrichment.
 * Shared by extractFromContent and extractFromUrl.
 */
async function executeAIExtraction(
  prompt: string,
  fallbackError: string
): Promise<ExtractionResult> {
  try {
    const ai = getAIClient();
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: EXTRACTION_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: extractedProductJsonSchema,
        },
      })
    );

    if (!response.text) {
      return { success: false, error: "No response from AI model" };
    }

    const parsed = JSON.parse(response.text);
    const validated = extractedProductSchema.parse(parsed);

    // Enrich with EUDAMED lookup (overwrites step 1 EMDN if found)
    try {
      const eudamed = await lookupEmdnViaEudamed(
        validated.name,
        validated.manufacturer_name,
        validated.sku
      );
      if (eudamed.code) {
        validated.suggested_emdn = eudamed.code;
        validated.emdn_source = eudamed.source;
        validated.emdn_rationale = eudamed.rationale;
      }
    } catch {
      /* keep step 1 result */
    }

    return { success: true, data: validated };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : fallbackError,
    };
  }
}

/**
 * Extract structured product data from a URL.
 * Uses Gemini's ability to fetch and analyze web content.
 */
export async function extractFromUrl(url: string): Promise<ExtractionResult> {
  // Validate URL
  try {
    new URL(url);
  } catch {
    return { success: false, error: "Invalid URL format" };
  }

  return executeAIExtraction(
    buildUrlExtractionPrompt(url),
    "Failed to extract from URL"
  );
}

/**
 * Extract structured product data from raw text content.
 */
export async function extractFromContent(
  content: string
): Promise<ExtractionResult> {
  if (!content || content.trim().length === 0) {
    return { success: false, error: "No content provided" };
  }

  const MAX_CONTENT_LENGTH = 100_000; // 100KB
  if (content.length > MAX_CONTENT_LENGTH) {
    return { success: false, error: `Content too large (${Math.round(content.length / 1000)}KB). Maximum is 100KB.` };
  }

  return executeAIExtraction(
    buildExtractionPrompt(content),
    "Extraction failed unexpectedly"
  );
}

/**
 * Build the extraction prompt for URL-based extraction.
 */
function buildUrlExtractionPrompt(url: string): string {
  return `You are a medical device data extraction specialist. Your task is to visit the provided URL and extract structured product information from the webpage.

## TARGET URL
${url}

## INSTRUCTIONS
1. Access and analyze the content at the provided URL
2. Look for product specifications, datasheets, or technical information
3. Extract the structured data according to the guidelines below

${getExtractionGuidelines()}

## IMPORTANT FOR WEB PAGES
- The page may contain multiple products - focus on the main/primary product being showcased
- Look for specification tables, technical data sections, and product descriptions
- Check for downloadable datasheets or spec sheets linked on the page
- If the URL is a product listing page, extract info for the featured product`;
}

/**
 * Build the extraction prompt for document content.
 */
function buildExtractionPrompt(content: string): string {
  return `You are a medical device data extraction specialist. Your task is to extract structured product information from the provided vendor product sheet, datasheet, or technical specification document.

${getExtractionGuidelines()}

## DOCUMENT TO EXTRACT FROM:
${content}`;
}

/**
 * Common extraction guidelines shared between URL and document extraction.
 */
function getExtractionGuidelines(): string {
  return `## EXTRACTION GUIDELINES

### Product Identification
- **name**: Extract the full official product name as stated by the manufacturer/vendor
  - Include product line, model, and variant identifiers (e.g., "Trident II Tritanium Acetabular Shell")
  - Do NOT include size specifications in the name unless it's part of the official product name

- **sku**: Extract the vendor catalog number, part number, or reference (REF) code
  - Look for labels like: REF, SKU, Catalog #, Part Number, Item Code, CFN
  - If multiple SKUs exist for size variants, extract the base/primary SKU

- **description**: Extract or summarize the product description
  - Include intended use, key features, and clinical applications
  - Capture material properties if described in prose form

### Vendor & Manufacturer Information
- **vendor_name**: The company selling/distributing the product
  - May be different from the manufacturer
  - Look for: Distributor, Supplier, Vendor, Sold by

- Note: manufacturer_name is captured separately in other fields when available

### Material & Technical Specifications
- **material_name**: Primary material composition
  - Common orthopedic materials: Titanium (Ti-6Al-4V), PEEK, Cobalt-Chrome, Stainless Steel, Polyethylene (UHMWPE), Ceramic, Hydroxyapatite (HA)
  - If alloy specified, include it (e.g., "Titanium Ti-6Al-4V ELI")
  - Look for ASTM standards (e.g., "per ASTM F136")

- **price**: Numeric unit price only (no currency symbols)
  - Extract the primary unit price, not bulk/quantity pricing
  - Set to null if not explicitly stated

- **price_currency**: Identify the currency of the extracted price
  - Valid values: "EUR", "CZK", "PLN"
  - Look for currency symbols (€, Kč, zł), codes (EUR, CZK, PLN), or contextual clues (country of vendor)
  - If price has no explicit currency, infer from vendor country or document language (Czech → CZK, Polish → PLN, otherwise → EUR)
  - Set to null if price is null or currency cannot be determined

### Regulatory & Compliance Information
- **ce_marked**: Boolean - true if CE marking is mentioned
  - Look for: CE, CE marked, CE certification, European Conformity
  - Also check for references to EU MDR (2017/745) compliance

- **mdr_class**: MDR risk classification if explicitly stated
  - Valid values: "I", "IIa", "IIb", "III"
  - Joint implants (hip, knee, shoulder) are typically Class III
  - Only extract if explicitly stated; do NOT infer

- **udi_di**: Unique Device Identifier - Device Identifier (max 14 characters)
  - Look for: UDI-DI, Device Identifier, (01) GTIN prefix
  - Set to null if not provided

### EMDN Classification
- **suggested_emdn**: Suggest an EMDN code if you can identify the product type
  - Format: P followed by digits (e.g., P0908030102)
  - Orthopedic implants use P09xx codes: P0901=shoulder, P0902=elbow, P0905=ankle, P0907=spine, P0908=hip, P0909=knee
  - Use the most specific (deepest) code you are confident about
  - Only suggest if reasonably confident; set to null if uncertain

- **emdn_source**: "document" if EMDN code is explicitly in the source, otherwise "inferred"
  - Set to null if no EMDN code was suggested

- **emdn_rationale**: Brief explanation (1-2 sentences) for why this EMDN category was chosen
  - Reference specific product characteristics that led to the classification

### Product URL
- **product_url**: Try to provide the official product page URL from the manufacturer's website
  - For well-known manufacturers (Stryker, DePuy/J&J, Zimmer Biomet, Smith+Nephew, Medtronic, B.Braun, Aesculap), construct the likely product page URL based on the product name and manufacturer
  - Format: full URL including https://
  - Example: "https://www.stryker.com/us/en/joint-replacement/products/trident-ii.html"
  - If you cannot determine the URL with reasonable confidence, set to null

## CRITICAL RULES
1. Extract ONLY what is explicitly stated in the document
2. Set fields to null if information is not found - do NOT guess or infer
3. For regulatory fields (MDR class, CE marking), only mark true/extract if explicitly confirmed
4. Material names should be technical/clinical, not marketing terms
5. Prices should be numeric only, converted to base unit if needed
6. For product_url, only provide URLs you are reasonably confident exist — do NOT fabricate URLs`;
}
