"use server";

import { getAIClient, EXTRACTION_MODEL } from "@/lib/gemini/client";
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
    console.error("PDF extraction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to parse PDF file",
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

  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: EXTRACTION_MODEL,
      contents: buildUrlExtractionPrompt(url),
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: extractedProductJsonSchema,
      },
    });

    if (!response.text) {
      return { success: false, error: "No response from AI model" };
    }

    const parsed = JSON.parse(response.text);
    const validated = extractedProductSchema.parse(parsed);

    return { success: true, data: validated };
  } catch (error) {
    console.error("URL extraction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to extract from URL",
    };
  }
}

/**
 * Extract structured product data from raw text content.
 */
export async function extractFromContent(
  content: string
): Promise<ExtractionResult> {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: EXTRACTION_MODEL,
      contents: buildExtractionPrompt(content),
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: extractedProductJsonSchema,
      },
    });

    if (!response.text) {
      return { success: false, error: "No response from AI model" };
    }
    const parsed = JSON.parse(response.text);
    const validated = extractedProductSchema.parse(parsed);

    return { success: true, data: validated };
  } catch (error) {
    console.error("Extraction error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Extraction failed unexpectedly",
    };
  }
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
- **suggested_emdn**: Suggest the most appropriate EMDN code based on product type. Use the MOST SPECIFIC code possible.

  **EMDN CATEGORY HIERARCHY (use exact codes):**

  **P0901 - SHOULDER PROSTHESES:**
  - P090103 - Glenoid components
    - P09010301 - Metal back and metaglene glenoid baseplates
    - P09010302 - Anatomical shoulder prosthesis inserts
    - P09010303 - Glenospheres
    - P09010304 - Monoblock glenoids
  - P090104 - Humeral components
    - P09010401 - Epiphysary humeral components (heads, cups)
    - P09010402 - Diaphysary humeral components (stems)

  **P0902 - ELBOW PROSTHESES:**
  - P090203 - Humeral components
  - P090204 - Radial components
  - P090205 - Ulnar components

  **P0905 - ANKLE PROSTHESES:**
  - P090506 - Ankle prosthesis with mobile insert
  - P090507 - Ankle prosthesis with fixed insert

  **P0907 - SPINE STABILISATION:**
  - P090701 - Spinal fusion systems (P09070101 - Spinal cages)
  - P090702 - Intervertebral disc replacement
  - P090703 - Spinal fixation systems

  **P0908 - HIP PROSTHESES (most common):**
  - P090803 - Acetabular components
    - P09080301 - Primary implant acetabular cups
      - P0908030101 - Cemented acetabular cups
      - P0908030102 - Uncemented acetabular cups
    - P09080304 - Acetabular inserts (P0908030401 polyethylene, P0908030402 ceramic)
    - P09080305 - Dual-mobility acetabular components
  - P090804 - Femoral components
    - P09080401 - Primary femoral stems
      - P0908040101 - Cemented femoral stems
      - P0908040102 - Uncemented femoral stems
    - P09080403 - Revision femoral stems
    - P09080405 - Femoral heads
      - P0908040501 - Partial hip replacement heads
      - P0908040502 - Total hip replacement heads (ceramic: P090804050201, metal: P090804050202)
    - P09080407 - Modular necks
  - P090880 - Hip prostheses accessories (screws, augments, adapters)

  **CLASSIFICATION RULES:**
  1. ALWAYS use the most specific (longest) code that matches the product
  2. Hip acetabular cup → P0908030101 (cemented) or P0908030102 (uncemented)
  3. Hip femoral stem → P0908040101 (cemented) or P0908040102 (uncemented)
  4. Hip femoral head → P090804050201 (ceramic) or P090804050202 (metal)
  5. Shoulder stem → P09010402xx based on type
  6. Knee prosthesis → Use P0909 category (not shown - use general if unsure)
  7. If unsure between levels, prefer the more specific child category

- **emdn_rationale**: Provide a brief explanation (1-2 sentences) for why you selected this EMDN category.
  - Reference specific product characteristics that led to the classification
  - Example: "Classified as P0908030102 (uncemented acetabular cup) because product is a porous-coated titanium shell designed for press-fit fixation without cement."

## CRITICAL RULES
1. Extract ONLY what is explicitly stated in the document
2. Set fields to null if information is not found - do NOT guess or infer
3. For regulatory fields (MDR class, CE marking), only mark true/extract if explicitly confirmed
4. Material names should be technical/clinical, not marketing terms
5. Prices should be numeric only, converted to base unit if needed`;
}
