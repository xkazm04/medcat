'use server'

import { getAIClient, EXTRACTION_MODEL, withRetry } from '@/lib/gemini/client'
import { lookupEmdnViaEudamed } from '@/lib/gemini/eudamed-lookup'
import {
  extractedProductSchema,
  extractedProductJsonSchema,
  type ExtractedProduct,
} from '@/lib/schemas/extraction'

interface BatchExtractionResult {
  success: boolean
  data?: ExtractedProduct
  error?: string
}

/**
 * Extract product data from a single spreadsheet row.
 *
 * Runs structured extraction and EUDAMED lookup **in parallel** — for batch rows
 * we already have product name/manufacturer/SKU from the spreadsheet columns,
 * so we can start the EUDAMED search immediately without waiting for extraction.
 */
export async function extractFromSpreadsheetRow(
  headers: string[],
  values: Record<string, string>,
  options: { webSearch?: boolean } = {}
): Promise<BatchExtractionResult> {
  const { webSearch = true } = options
  const lines = headers
    .map((h) => `${h}: ${values[h] || ''}`)
    .filter((line) => !line.endsWith(': '))

  if (lines.length === 0) {
    return { success: false, error: 'Empty row' }
  }

  // Detect key fields from spreadsheet columns for parallel EUDAMED search
  const productName = detectField(headers, values, [
    'product name', 'name', 'product', 'nazov', 'nazov produktu', 'název',
    'bezeichnung', 'produktbezeichnung', 'description',
  ])
  const manufacturer = detectField(headers, values, [
    'manufacturer', 'vyrobca', 'výrobce', 'výrobca', 'hersteller',
    'mfr', 'manufacturer name',
  ])
  const sku = detectField(headers, values, [
    'cfn/ref', 'cfn', 'ref', 'sku', 'catalog', 'part number', 'item code',
    'reference', 'katalog', 'art.nr', 'artikelnummer',
  ])

  // Run extraction + EUDAMED lookup in parallel (skip EUDAMED if webSearch disabled)
  const [extractionSettled, eudamedSettled] = await Promise.allSettled([
    runExtraction(lines),
    webSearch && productName
      ? lookupEmdnViaEudamed(productName, manufacturer, sku)
      : Promise.resolve(null),
  ])

  // Extract base result
  if (extractionSettled.status === 'rejected') {
    return {
      success: false,
      error: extractionSettled.reason instanceof Error
        ? extractionSettled.reason.message
        : 'Extraction failed',
    }
  }

  const extractionResult = extractionSettled.value
  if (!extractionResult.success || !extractionResult.data) {
    return extractionResult
  }

  const data = extractionResult.data

  // Merge EUDAMED result — overwrites inferred EMDN if EUDAMED found a real code
  if (eudamedSettled.status === 'fulfilled' && eudamedSettled.value) {
    const eudamed = eudamedSettled.value
    if (eudamed.code) {
      data.suggested_emdn = eudamed.code
      data.emdn_source = eudamed.source
      data.emdn_rationale = eudamed.rationale
    }
  }

  return { success: true, data }
}

/**
 * Detect a field value from spreadsheet columns by matching against common header names.
 */
function detectField(
  headers: string[],
  values: Record<string, string>,
  patterns: string[]
): string | null {
  for (const pattern of patterns) {
    const header = headers.find((h) => h.toLowerCase().includes(pattern))
    if (header && values[header]) {
      return values[header]
    }
  }
  return null
}

/**
 * Run the structured extraction call via Gemini.
 */
async function runExtraction(
  lines: string[]
): Promise<BatchExtractionResult> {
  const prompt = buildBatchPrompt(lines)

  try {
    const ai = getAIClient()
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: EXTRACTION_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseJsonSchema: extractedProductJsonSchema,
        },
      })
    )

    if (!response.text) {
      return { success: false, error: 'No response from AI model' }
    }

    const parsed = JSON.parse(response.text)
    const validated = extractedProductSchema.parse(parsed)
    return { success: true, data: validated }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Extraction failed',
    }
  }
}

/**
 * Focused prompt for spreadsheet rows — streamlined for semi-structured key-value data
 * but with full quality for material, regulatory, EMDN, and URL fields.
 */
function buildBatchPrompt(lines: string[]): string {
  return `You are a medical device data extraction specialist. Map the spreadsheet fields below to structured product data.

## SPREADSHEET ROW
${lines.join('\n')}

## FIELD MAPPING RULES

**name**: Full official product name as stated (include model/variant, exclude pack sizes like "100ks/bal").
**sku**: Catalog number, REF, CFN, part number, or item code.
**description**: Product description, intended use, key features. Summarize if the product name contains technical specs.
**price**: Numeric unit price only. Null if not stated.
**price_currency**: "EUR", "CZK", or "PLN". Infer from vendor country or language (Czech/Slovak → CZK, Polish → PLN, else → EUR). Null if price is null.
**vendor_name**: Distributor or seller (may differ from manufacturer). Null if absent.
**manufacturer_name**: Original manufacturer / OEM. Null if absent.
**material_name**: Technical material composition. For well-known products, use your knowledge:
  - Syringes: typically Polypropylene (PP)
  - Nitrile gloves: Nitrile
  - IOL lenses: Acrylic (hydrophobic or hydrophilic)
  - Spinal needles: Stainless steel
  - Set to null only if truly unknown.
**ce_marked**: true if CE marking or EU MDR compliance is mentioned, or if the manufacturer is known to CE-mark all EU-distributed products. false if no evidence.
**mdr_class**: "I", "IIa", "IIb", or "III" — only if explicitly stated. Null otherwise.
**udi_di**: UDI-DI if provided (max 14 chars). Null otherwise.
**suggested_emdn**: Suggest the EMDN (European Medical Device Nomenclature) code. Use the most specific code you are confident about.
  - EMDN codes always start with a letter: P=implantable, Z=single-use, V=ophthalmic, Y=dental, W=electro-medical, etc.
  - Common codes: P0908=hip, P0909=knee, P0301=IOL, Z12=syringes, Z09=needles, Z0301=gloves
  - If uncertain, set to null rather than guess.
**emdn_source**: "document" if EMDN code appears in the spreadsheet data, "inferred" if you deduced it. Null if no code.
**emdn_rationale**: 1-2 sentence explanation for the EMDN choice. Null if no code.
**product_url**: For well-known manufacturers (BD, B.Braun, Alcon, J&J, Stryker, Zimmer, etc.), construct the most likely official product page URL. Set to null if unknown manufacturer or uncertain.

## RULES
- Extract what is stated. For fields like material and product_url, you MAY use your knowledge of well-known medical products.
- Regulatory fields (mdr_class, udi_di): only extract if explicitly confirmed in the data.
- Material names should be technical, not marketing terms.
- Product names in Slovak/Czech should be kept as-is (do not translate).`
}
