  1. Input Detection - System determines input type (file vs URL) and routes to appropriate handler
  (extractFromProductSheet, extractFromUrl)
  2. Content Preparation
    - Text files (.txt, .md): Direct text extraction, max 50KB
    - PDF files: Parse via pdf-parse, extract text content, max 100KB
    - URLs: Passed directly to Gemini which fetches the page
  3. Prompt Construction - Builds specialized prompt based on source type:
    - buildExtractionPrompt() for documents
    - buildUrlExtractionPrompt() for web pages (includes URL directly)
  4. Shared Guidelines Injection - getExtractionGuidelines() appends common rules covering:
    - Product identification (name, SKU, description)
    - Vendor/manufacturer extraction
    - Material & technical specs
    - Regulatory fields (CE, MDR class, UDI-DI)
  5. EMDN Classification Hierarchy - Prompt includes full category tree (P0901-P0909) with classification rules to help
  Gemini select the most specific code
  6. Structured Output Request - Gemini call configured with:
    - responseMimeType: "application/json"
    - responseJsonSchema: extractedProductJsonSchema (Zod-derived schema)
  7. Response Parsing - JSON response parsed and validated against extractedProductSchema
  8. Rationale Capture - Gemini provides emdn_rationale explaining why it chose the EMDN category
  9. Null Handling - Fields not found in source are explicitly set to null (no guessing)
  10. Error Propagation - Failures at any stage return structured { success: false, error: string } for UI display