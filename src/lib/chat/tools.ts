import { tool, generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod/v4';
import { getProducts, getEMDNCategoriesFlat } from '@/lib/queries';
import { getProductPriceComparison } from '@/lib/actions/similarity';
import { getReferencePricesForProduct, getReferencePricesByCategory } from '@/lib/actions/reference-prices';
import { estimateComponentPrice, formatFractionRange } from '@/lib/utils/component-fractions';

// Create isolated Google provider for web search tool
const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * Search the product catalog for medical devices.
 * Wraps getProducts() with natural language parameter mapping.
 */
export const searchProducts = tool({
  description:
    'Search the product catalog for medical devices. Use when user asks to find, show, or search for products.',
  inputSchema: z.object({
    query: z
      .string()
      .describe('Natural language search term (e.g., "titanium knee implants")'),
    category: z
      .string()
      .optional()
      .describe('EMDN category ID to filter by'),
    vendor: z.string().optional().describe('Vendor ID to filter by'),
    material: z
      .string()
      .optional()
      .describe('Material ID to filter by (e.g., titanium, PEEK)'),
    minPrice: z.number().optional().describe('Minimum price in EUR'),
    maxPrice: z.number().optional().describe('Maximum price in EUR'),
    limit: z
      .number()
      .default(5)
      .describe('Number of results to return (default 5)'),
  }),
  execute: async ({ query, category, vendor, material, minPrice, maxPrice, limit }) => {
    const result = await getProducts({
      search: query,
      category,
      vendor,
      material,
      minPrice,
      maxPrice,
      pageSize: limit,
    });
    return {
      products: result.data,
      totalCount: result.count,
      showing: result.data.length,
    };
  },
});

/**
 * Compare prices for a product across different vendors.
 * Wraps getProductPriceComparison() for similarity-based price lookup.
 */
export const comparePrices = tool({
  description:
    'Compare prices for a product across different vendors. Use when user asks to compare prices or see vendor pricing.',
  inputSchema: z.object({
    productId: z.string().describe('UUID of the product to compare'),
  }),
  execute: async ({ productId }) => {
    const result = await getProductPriceComparison(productId);
    if (!result.success) {
      return { error: result.error, products: [] };
    }
    return {
      products: result.data || [],
      count: result.data?.length || 0,
    };
  },
});

/**
 * Suggest EMDN categories when user query is ambiguous or broad.
 * Analyzes search results to find relevant category distribution.
 */
export const suggestCategories = tool({
  description:
    'Suggest EMDN categories when user query is ambiguous or broad. Use to help narrow down search.',
  inputSchema: z.object({
    query: z.string().describe('The ambiguous or broad search term'),
  }),
  execute: async ({ query }) => {
    // Get products matching query to analyze category distribution
    const result = await getProducts({
      search: query,
      pageSize: 50,
    });

    // Extract unique categories from product results
    const categoryMap = new Map<
      string,
      { id: string; code: string; name: string; count: number }
    >();

    result.data.forEach((product) => {
      if (product.emdn_category) {
        const cat = product.emdn_category;
        const existing = categoryMap.get(cat.id);
        if (existing) {
          existing.count++;
        } else {
          categoryMap.set(cat.id, {
            id: cat.id,
            code: cat.code,
            name: cat.name,
            count: 1,
          });
        }
      }
    });

    // If product search yielded no categories, search category names directly
    if (categoryMap.size === 0) {
      const allCategories = await getEMDNCategoriesFlat();
      const words = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
      const matched = allCategories.filter((cat) => {
        const name = cat.name.toLowerCase();
        const code = cat.code.toLowerCase();
        return words.some(w => name.includes(w) || code.includes(w));
      });
      // Take top 5 by relevance (more word matches = higher rank)
      matched
        .sort((a, b) => {
          const scoreA = words.filter(w => a.name.toLowerCase().includes(w)).length;
          const scoreB = words.filter(w => b.name.toLowerCase().includes(w)).length;
          return scoreB - scoreA;
        })
        .slice(0, 5)
        .forEach((cat) => {
          categoryMap.set(cat.id, {
            id: cat.id,
            code: cat.code,
            name: cat.name,
            count: 0,
          });
        });
    }

    const suggestions = Array.from(categoryMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      suggestions,
      totalProducts: result.count,
    };
  },
});

/**
 * Search the web for EU medical device market alternatives.
 * Uses isolated generateText call with Google Search grounding.
 * CRITICAL: Cannot combine google.tools.googleSearch() with custom tools in same request.
 */
export const searchExternalProducts = tool({
  description:
    'Search the web for EU medical device market alternatives to a catalog product. Only use when user explicitly asks for "alternatives" or "search the web". Must reference a specific catalog product.',
  inputSchema: z.object({
    productName: z.string().describe('Name of the catalog product to find alternatives for'),
    productCategory: z
      .string()
      .optional()
      .describe('EMDN category or product type for context'),
    vendorName: z
      .string()
      .optional()
      .describe('Current vendor for exclusion context'),
  }),
  execute: async ({ productName, productCategory, vendorName }) => {
    try {
      // Build search context - MUST include 'EU market' and 'CE marked'
      const contextParts = [
        productName,
        productCategory,
        'orthopedic medical device',
        'EU market',
        'CE marked',
        'alternatives',
        vendorName ? `alternative to ${vendorName}` : '',
      ].filter(Boolean);
      const searchContext = contextParts.join(' ');

      // Isolated generateText call with provider tool (cannot mix with custom tools)
      const response = await generateText({
        model: google('gemini-2.5-flash'),
        tools: {
          google_search: google.tools.googleSearch({}),
        },
        prompt: `Find 3-5 EU market alternatives to this orthopedic medical device: ${searchContext}

For each alternative found:
1. Extract the product name
2. Note the manufacturer
3. Keep the source URL

Additionally, search these official pricing registries for reference prices:
- France LPPR (legifrance.gouv.fr, ameli.fr) - reimbursement tariff ceiling. LPP codes: 31xxxxx or 27xxxxx.
- Slovakia MZ SR (kategorizacia.mzsr.sk) - device category reimbursement ceilings (XC2.*, XC3.* codes)
- EU TED (ted.europa.eu) - framework agreement award notices with unit prices (CPV 33183100)
- UK NHS (find-tender.service.gov.uk) - framework agreement ceiling prices

If pricing data is found, include: country (2-letter ISO), source registry, reference code, price in EUR, and source URL.
IMPORTANT: Only include prices from official government registries, reimbursement databases, and public procurement portals. Do NOT include prices from retail marketplaces or commercial catalog websites.

Focus on CE-marked devices from European manufacturers or distributors.`,
        temperature: 1.0, // Recommended for grounding
      });

      // Extract grounding metadata - handle undefined gracefully
      const groundingMetadata = (response.providerMetadata?.google as any)?.groundingMetadata;

      // If no grounding metadata, return graceful failure
      if (!groundingMetadata) {
        return {
          hasResults: false,
          summary: 'Unable to retrieve web search results.',
          sources: [],
          searchQueries: [],
        };
      }

      // Extract and validate sources from grounding chunks
      const sources = (groundingMetadata.groundingChunks || [])
        .filter((chunk: any) => chunk.web?.uri)
        .map((chunk: any) => {
          try {
            return {
              url: chunk.web.uri,
              title: chunk.web.title || 'External Source',
              domain: new URL(chunk.web.uri).hostname.replace('www.', ''),
            };
          } catch {
            // Invalid URL - skip this source
            return null;
          }
        })
        .filter(Boolean)
        .slice(0, 5); // Limit to 5 sources per CONTEXT.md

      return {
        summary: response.text,
        sources,
        searchQueries: groundingMetadata.webSearchQueries || [],
        hasResults: sources.length > 0,
      };
    } catch (error) {
      console.error('[searchExternalProducts] Error:', error);
      return {
        hasResults: false,
        summary: 'Web search failed. Please try again.',
        sources: [],
        searchQueries: [],
      };
    }
  },
});

/**
 * Look up reference prices from EU reimbursement registries and procurement databases.
 * Returns stored pricing data from LPPR (France), MZ SR (Slovakia), TED tenders, etc.
 */
export const lookupReferencePrices = tool({
  description:
    'Look up reference prices from EU reimbursement registries and procurement databases (LPPR, MZ SR, TED tenders). Use when user asks about reference prices, reimbursement rates, official pricing, or EU market prices for a product or category.',
  inputSchema: z.object({
    productId: z
      .string()
      .optional()
      .describe('UUID of a specific catalog product'),
    emdnCategoryId: z
      .string()
      .optional()
      .describe('UUID of an EMDN category for category-level pricing'),
    countries: z
      .array(z.string())
      .optional()
      .describe('ISO 3166 alpha-2 country codes to filter by (e.g., ["FR", "SK", "CZ"])'),
  }),
  execute: async ({ productId, emdnCategoryId, countries }) => {
    // Prefer product-level lookup (also fetches category prices via RPC)
    if (productId) {
      const result = await getReferencePricesForProduct(productId);
      if (!result.success) {
        return { error: result.error, prices: [], summary: null };
      }
      let prices = result.data || [];
      if (countries && countries.length > 0) {
        prices = prices.filter((p) => countries.includes(p.source_country));
      }

      // Build a precision summary for the AI
      const productMatches = prices.filter(p => p.match_type === 'product_match' || p.match_type === 'product_direct');
      const categoryMatches = prices.filter(p => p.match_type !== 'product_match' && p.match_type !== 'product_direct');
      const pmPrices = productMatches.map(p => p.price_eur);
      const allPrices = prices.map(p => p.price_eur);

      // Scope breakdown
      const setPrices = prices.filter(p => p.price_scope === 'set');
      const componentPrices = prices.filter(p => p.price_scope === 'component');

      // Component fraction estimation using product's EMDN code
      let componentEstimate: { min: number; max: number; label: string; fractionRange: string } | null = null;
      if (setPrices.length > 0 && componentPrices.length === 0 && result.productEmdnCode) {
        const avgSetPrice = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;
        const est = estimateComponentPrice(result.productEmdnCode, avgSetPrice);
        if (est) {
          componentEstimate = {
            min: est.min,
            max: est.max,
            label: est.label,
            fractionRange: formatFractionRange(est.fractionMin, est.fractionMax),
          };
        }
      }

      const summary = prices.length > 0 ? {
        totalPrices: prices.length,
        productMatchCount: productMatches.length,
        categoryMatchCount: categoryMatches.length,
        bestMatchRange: pmPrices.length > 0
          ? { min: Math.min(...pmPrices), max: Math.max(...pmPrices) }
          : null,
        allRange: { min: Math.min(...allPrices), max: Math.max(...allPrices) },
        scopeBreakdown: {
          set: setPrices.length,
          component: componentPrices.length,
          procedure: prices.filter(p => p.price_scope === 'procedure').length,
        },
        componentEstimate,
        hint: [
          productMatches.length > 0
            ? `${productMatches.length} prices are manufacturer-matched (high confidence). Present these prominently.`
            : 'All prices are category-level matches. Note these are approximate comparisons.',
          setPrices.length > 0 && componentPrices.length === 0
            ? 'IMPORTANT: All prices are SET prices (complete surgical kits). The product is likely a single component. Clearly explain this to the user — the set price includes multiple components.'
            : '',
          componentPrices.length > 0
            ? `${componentPrices.length} prices are per-component (most relevant for individual products).`
            : '',
          componentEstimate
            ? `Estimated component (${componentEstimate.label}) cost: €${componentEstimate.min}–€${componentEstimate.max} (${componentEstimate.fractionRange} of set price).`
            : '',
        ].filter(Boolean).join(' '),
      } : null;

      return { prices, count: prices.length, summary };
    }

    // Category-level lookup
    if (emdnCategoryId) {
      const result = await getReferencePricesByCategory(emdnCategoryId, countries);
      if (!result.success) {
        return { error: result.error, prices: [], summary: null };
      }
      return { prices: result.data || [], count: result.data?.length || 0, summary: null };
    }

    return { error: 'Provide either productId or emdnCategoryId', prices: [], summary: null };
  },
});
