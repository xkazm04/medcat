---
phase: 03-ai-extraction
plan: 01
subsystem: ai
tags: [gemini, genai, zod, json-schema, llm, extraction]

# Dependency graph
requires:
  - phase: 02-product-management
    provides: Product schema foundation and Zod patterns
provides:
  - GoogleGenAI client initialization with API key validation
  - Extraction schema with JSON Schema conversion for Gemini
  - EXTRACTION_MODEL constant for consistent model reference
affects: [03-02 extraction-actions, 03-03 upload-ui, 03-04 extraction-sheet]

# Tech tracking
tech-stack:
  added: ["@google/genai ^1.39.0"]
  patterns: ["Zod v4 z.toJSONSchema() for LLM structured output"]

key-files:
  created:
    - src/lib/gemini/client.ts
    - src/lib/schemas/extraction.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Use extractedProductSchema with string vendor_name/material_name (not UUIDs) for extraction"
  - "Export EXTRACTION_MODEL as constant for single source of truth"

patterns-established:
  - "Server-only Gemini client: src/lib/gemini/client.ts throws if API key missing"
  - "Extraction schema separate from product schema: strings for names, resolved to UUIDs later"

# Metrics
duration: 3min
completed: 2026-02-02
---

# Phase 3 Plan 1: SDK and Schema Setup Summary

**Gemini SDK with Zod v4 JSON Schema export for structured AI extraction of vendor product data**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-02T15:14:49Z
- **Completed:** 2026-02-02T15:17:30Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Installed @google/genai SDK v1.39.0 for Gemini API integration
- Created server-only Gemini client with API key validation
- Defined extraction schema with all product fields and .describe() annotations
- Exported JSON Schema for Gemini structured output using native z.toJSONSchema()

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @google/genai SDK** - `51457e5` (chore)
2. **Task 2: Create Gemini client module** - `30eca35` (feat)
3. **Task 3: Create extraction schema** - `97f9649` (feat)

## Files Created/Modified
- `package.json` - Added @google/genai ^1.39.0 dependency
- `package-lock.json` - Locked dependencies
- `src/lib/gemini/client.ts` - GoogleGenAI initialization with API key validation, exports ai and EXTRACTION_MODEL
- `src/lib/schemas/extraction.ts` - extractedProductSchema, ExtractedProduct type, extractedProductJsonSchema

## Decisions Made
- **Extraction schema separate from product schema:** Uses vendor_name/material_name as strings (extracted text) rather than UUIDs. The preview form will resolve these to database IDs later.
- **Model constant export:** EXTRACTION_MODEL = "gemini-3-flash-preview" exported for consistent usage across extraction actions.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration.** User must obtain a Gemini API key:
- Visit https://aistudio.google.com/apikey
- Create an API key
- Add to `.env.local`: `GEMINI_API_KEY=your_api_key_here`

## Next Phase Readiness
- Gemini SDK ready for extraction Server Actions (03-02)
- Schema exports ready for import in actions/extraction.ts
- JSON Schema validated and outputs correct draft-2020-12 format

---
*Phase: 03-ai-extraction*
*Completed: 2026-02-02*
