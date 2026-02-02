# Phase 3: AI Extraction - Research

**Researched:** 2026-02-02
**Domain:** LLM-based structured data extraction with Google Gemini API
**Confidence:** HIGH

## Summary

This phase implements AI-powered extraction of product data from vendor product sheets using the Google Gemini API. The core workflow is: user uploads a text/markdown file, Gemini extracts structured product data into a predefined schema, user previews and edits the extracted data, then commits to the database.

The standard approach uses the `@google/genai` SDK with structured output (JSON Schema) to guarantee extraction results match our product schema. Zod v4's native `z.toJSONSchema()` converts existing Zod schemas directly for Gemini, avoiding third-party dependencies. The extraction happens server-side via Next.js Server Actions, keeping API keys secure.

Key architectural pattern: Two-phase workflow - first Server Action extracts data and returns JSON to client, second Server Action (reusing existing `createProduct`) saves to database. This allows preview/edit between extraction and save.

**Primary recommendation:** Use `@google/genai` SDK with Zod v4 native JSON Schema conversion for typed extraction, implementing a two-phase upload-then-save workflow with client-side preview.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @google/genai | ^1.37.0 | Gemini API SDK | Official Google SDK, unified API for all Gemini models |
| zod | ^4.3.6 | Schema + JSON Schema | Already in project; v4 has native `z.toJSONSchema()` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none needed) | - | - | Zod v4 eliminates need for zod-to-json-schema |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @google/genai | @google/generative-ai | Legacy package, deprecated with Gemini 2.0 |
| z.toJSONSchema() | zod-to-json-schema | Extra dependency, v4 native is preferred |
| Structured output | Function calling | Both work, structured output is simpler for extraction |

**Installation:**
```bash
npm install @google/genai
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/
    gemini/
      client.ts          # GoogleGenAI initialization
      extraction.ts      # Extraction logic with schema
    schemas/
      extraction.ts      # Zod schema for extraction output
    actions/
      extraction.ts      # Server Action for file upload + extraction
  components/
    extraction/
      upload-form.tsx    # File input + upload button
      extraction-preview.tsx  # Preview/edit extracted data
      extraction-sheet.tsx    # Side panel orchestrating workflow
```

### Pattern 1: Two-Phase Extraction Workflow
**What:** Separate extraction from database save with client-side preview between
**When to use:** When users need to review/edit AI-extracted data before committing
**Example:**
```typescript
// Phase 1: Extract (Server Action)
// Source: https://ai.google.dev/gemini-api/docs/structured-output
"use server";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const extractionSchema = z.object({
  name: z.string().describe("Product name"),
  sku: z.string().describe("Vendor SKU or catalog number"),
  description: z.string().nullable().describe("Product description"),
  price: z.number().nullable().describe("Unit price in CZK"),
  vendor_name: z.string().nullable().describe("Vendor company name"),
  material: z.string().nullable().describe("Primary material composition"),
  ce_marked: z.boolean().describe("Whether product has CE marking"),
  mdr_class: z.enum(["I", "IIa", "IIb", "III"]).nullable().describe("MDR risk class"),
  suggested_emdn_code: z.string().nullable().describe("Suggested EMDN category code"),
});

export async function extractProductData(formData: FormData) {
  const file = formData.get("file") as File;
  const content = await file.text();

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Extract product information from this vendor product sheet:\n\n${content}`,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: z.toJSONSchema(extractionSchema),
    },
  });

  const extracted = extractionSchema.parse(JSON.parse(response.text));
  return { success: true, data: extracted };
}

// Phase 2: Client displays in form, user edits, then calls createProduct
```

### Pattern 2: EMDN Classification Suggestion
**What:** Use LLM to suggest EMDN code based on product description
**When to use:** When extracted data needs domain-specific classification
**Example:**
```typescript
// Include EMDN context in extraction prompt
const prompt = `
Extract product information from this vendor product sheet.

For the EMDN classification, suggest a code from orthopedic categories:
- P09: Orthopaedic and prosthetic devices
- P0901: Orthopaedic bone implants
- P0902: Orthopaedic joint implants
- P10: Orthopaedic external devices
(Use the most specific matching code)

Product sheet:
${content}
`;
```

### Pattern 3: Resolver Pattern for Foreign Keys
**What:** After extraction, resolve names to database IDs before form display
**When to use:** When extracted data contains names but form needs UUIDs
**Example:**
```typescript
// In extraction action, after Gemini returns data:
async function resolveReferences(extracted: ExtractedData) {
  const supabase = await createClient();

  // Find or suggest vendor by name
  const { data: vendors } = await supabase
    .from("vendors")
    .select("id, name")
    .ilike("name", `%${extracted.vendor_name}%`);

  // Find EMDN category by code
  const { data: emdn } = await supabase
    .from("emdn_categories")
    .select("id, code, name")
    .eq("code", extracted.suggested_emdn_code);

  return {
    ...extracted,
    vendor_id: vendors?.[0]?.id ?? null,
    emdn_category_id: emdn?.[0]?.id ?? null,
    resolved: { vendors, emdn }, // For dropdown pre-selection
  };
}
```

### Anti-Patterns to Avoid
- **Client-side Gemini calls:** Exposes API key; always use Server Actions
- **Direct save without preview:** Users lose ability to correct extraction errors
- **Hardcoded schema in prompts:** Use Zod schema as single source of truth
- **Ignoring extraction confidence:** Consider adding confidence indicators for uncertain fields

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Zod to JSON Schema | Custom serializer | `z.toJSONSchema()` | Zod v4 native, handles edge cases |
| Structured LLM output | Regex parsing of freeform | Gemini responseJsonSchema | Guarantees valid JSON matching schema |
| File text extraction | Custom parsing | `File.text()` API | Native browser/Node API for text files |
| Form state management | useState soup | React Hook Form | Already in project, handles validation |

**Key insight:** Gemini's structured output with JSON Schema eliminates the parsing problem entirely. The response is guaranteed to be valid JSON matching your schema - no regex, no "please respond in JSON", no parsing errors.

## Common Pitfalls

### Pitfall 1: Schema Complexity Limits
**What goes wrong:** Gemini rejects schemas that are too complex (InvalidArgument: 400)
**Why it happens:** Long property names, deeply nested objects, many optional fields
**How to avoid:** Keep extraction schema flat; resolve to full product schema client-side
**Warning signs:** 400 errors mentioning schema complexity

### Pitfall 2: Unrepresentable Zod Types
**What goes wrong:** `z.toJSONSchema()` throws on Date, bigint, undefined, transforms
**Why it happens:** These types have no JSON Schema equivalent
**How to avoid:** Use `unrepresentable: "any"` option or avoid these types in extraction schema
**Warning signs:** Runtime errors during schema conversion

### Pitfall 3: Missing API Key Handling
**What goes wrong:** Extraction fails silently or with cryptic errors
**Why it happens:** GEMINI_API_KEY not set in environment
**How to avoid:** Check env var exists; provide clear error message
**Warning signs:** Generic "authentication failed" errors

### Pitfall 4: Large File Content
**What goes wrong:** Gemini context window exceeded or slow responses
**Why it happens:** Product sheets can be large; full content sent as prompt
**How to avoid:** Truncate to reasonable limit (e.g., 50KB); warn user for large files
**Warning signs:** Timeouts, incomplete extractions, high token costs

### Pitfall 5: EMDN Code Not Found
**What goes wrong:** Suggested EMDN code doesn't match any in database
**Why it happens:** LLM suggests code that doesn't exist or isn't in orthopedic subset
**How to avoid:** Validate suggested code against database; show suggestions with confidence
**Warning signs:** emdn_category_id resolves to null despite suggestion

## Code Examples

Verified patterns from official sources:

### Gemini Client Initialization
```typescript
// src/lib/gemini/client.ts
// Source: https://github.com/googleapis/js-genai
import { GoogleGenAI } from "@google/genai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable is required");
}

export const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const EXTRACTION_MODEL = "gemini-3-flash-preview";
```

### Structured Output with Zod v4
```typescript
// src/lib/schemas/extraction.ts
// Source: https://zod.dev/json-schema
import { z } from "zod";

export const extractedProductSchema = z.object({
  name: z.string().describe("Product name as stated by vendor"),
  sku: z.string().describe("Vendor SKU, catalog number, or part number"),
  description: z.string().nullable().describe("Full product description"),
  price: z.number().nullable().describe("Unit price (numeric only, no currency)"),
  vendor_name: z.string().nullable().describe("Vendor or manufacturer name"),
  material_name: z.string().nullable().describe("Primary material (titanium, PEEK, etc.)"),
  ce_marked: z.boolean().describe("True if CE marking mentioned"),
  mdr_class: z.enum(["I", "IIa", "IIb", "III"]).nullable().describe("MDR classification if stated"),
  udi_di: z.string().nullable().describe("UDI-DI if provided (max 14 chars)"),
  suggested_emdn: z.string().nullable().describe("Suggested EMDN code (P09xx or P10xx)"),
});

export type ExtractedProduct = z.infer<typeof extractedProductSchema>;

// Convert to JSON Schema for Gemini
export const extractedProductJsonSchema = z.toJSONSchema(extractedProductSchema, {
  target: "draft-2020-12",
});
```

### Server Action for Extraction
```typescript
// src/lib/actions/extraction.ts
"use server";

import { ai, EXTRACTION_MODEL } from "@/lib/gemini/client";
import { extractedProductSchema, extractedProductJsonSchema } from "@/lib/schemas/extraction";

interface ExtractionResult {
  success: boolean;
  data?: ExtractedProduct;
  error?: string;
}

export async function extractFromProductSheet(formData: FormData): Promise<ExtractionResult> {
  const file = formData.get("file") as File | null;

  if (!file) {
    return { success: false, error: "No file provided" };
  }

  if (!file.name.endsWith(".txt") && !file.name.endsWith(".md")) {
    return { success: false, error: "Only .txt and .md files are supported" };
  }

  const content = await file.text();

  if (content.length > 50000) {
    return { success: false, error: "File too large (max 50KB)" };
  }

  try {
    const response = await ai.models.generateContent({
      model: EXTRACTION_MODEL,
      contents: buildExtractionPrompt(content),
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: extractedProductJsonSchema,
      },
    });

    const parsed = JSON.parse(response.text);
    const validated = extractedProductSchema.parse(parsed);

    return { success: true, data: validated };
  } catch (error) {
    console.error("Extraction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Extraction failed"
    };
  }
}

function buildExtractionPrompt(content: string): string {
  return `You are a medical device data extraction assistant. Extract structured product information from the following vendor product sheet.

IMPORTANT GUIDELINES:
- Extract exactly what is stated; do not infer missing data
- For price, extract numeric value only (no currency symbols)
- For EMDN, suggest code from orthopedic categories: P09 (bone/prosthetic), P0901 (bone implants), P0902 (joint implants), P10 (external devices)
- For MDR class, only extract if explicitly stated (I, IIa, IIb, or III)
- Set fields to null if information is not found

VENDOR PRODUCT SHEET:
${content}`;
}
```

### File Upload Form Component
```typescript
// src/components/extraction/upload-form.tsx
"use client";

import { useState, useTransition } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";
import { extractFromProductSheet } from "@/lib/actions/extraction";
import type { ExtractedProduct } from "@/lib/schemas/extraction";

interface UploadFormProps {
  onExtracted: (data: ExtractedProduct) => void;
}

export function UploadForm({ onExtracted }: UploadFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setFileName(file?.name ?? null);
    setError(null);
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await extractFromProductSheet(formData);
      if (result.success && result.data) {
        onExtracted(result.data);
      } else {
        setError(result.error ?? "Extraction failed");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
        <input
          type="file"
          name="file"
          accept=".txt,.md"
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            {fileName ?? "Click to upload .txt or .md file"}
          </p>
        </label>
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending || !fileName}
        className="w-full bg-accent text-accent-foreground py-2 px-4 rounded-md font-medium disabled:opacity-50"
      >
        {isPending ? (
          <><Loader2 className="inline mr-2 h-4 w-4 animate-spin" /> Extracting...</>
        ) : (
          <><FileText className="inline mr-2 h-4 w-4" /> Extract Product Data</>
        )}
      </button>
    </form>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @google/generative-ai | @google/genai | Gemini 2.0 (late 2025) | Unified SDK, new API surface |
| zod-to-json-schema | z.toJSONSchema() | Zod v4 (2025) | Native support, no extra dep |
| Prompt-based JSON | responseJsonSchema | Gemini 2.0+ | Guaranteed schema conformance |
| gemini-2.0-flash | gemini-3-flash-preview | Late 2025 | Model specified in PROJECT.md |

**Deprecated/outdated:**
- `@google/generative-ai`: Use `@google/genai` instead (official deprecation)
- `zod-to-json-schema` package: Zod v4 has native support
- Gemini 2.0 Flash models: Retiring March 2026, use Gemini 3 or 2.5

## Open Questions

Things that couldn't be fully resolved:

1. **Gemini 3 flash preview model ID**
   - What we know: PROJECT.md specifies "gemini-3-flash-preview"
   - What's unclear: Exact model ID format for @google/genai SDK
   - Recommendation: Test with specified ID; fallback to "gemini-2.5-flash" if needed

2. **EMDN suggestion accuracy**
   - What we know: LLM can suggest codes based on description
   - What's unclear: How reliably it maps to orthopedic subset (P09, P10)
   - Recommendation: Show suggested EMDN as dropdown with search, not auto-select

3. **Vendor matching strategy**
   - What we know: Extracted vendor_name needs to map to vendors table
   - What's unclear: How to handle new vendors not in database
   - Recommendation: Show vendor_name field + dropdown; allow creating new vendor

## Sources

### Primary (HIGH confidence)
- [@google/genai GitHub](https://github.com/googleapis/js-genai) - SDK usage, initialization, generateContent API
- [Zod JSON Schema docs](https://zod.dev/json-schema) - z.toJSONSchema() usage and options
- [Google Gemini Structured Output](https://ai.google.dev/gemini-api/docs/structured-output) - responseJsonSchema config

### Secondary (MEDIUM confidence)
- [Google Blog: Improving Structured Outputs](https://blog.google/technology/developers/gemini-api-structured-outputs/) - JSON Schema support announcement
- [Next.js Forms Guide](https://nextjs.org/docs/app/guides/forms) - Server Action patterns with FormData

### Tertiary (LOW confidence)
- WebSearch results for extraction workflow patterns - general architecture guidance

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official SDK docs, Zod docs verified
- Architecture: HIGH - Patterns from official SDK examples and Next.js docs
- Pitfalls: MEDIUM - Based on SDK docs and general LLM experience

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - Gemini API is fast-moving)
