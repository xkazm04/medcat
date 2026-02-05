import { tool } from 'ai';
import { z } from 'zod/v4';
import { getProducts } from '@/lib/queries';
import { getProductPriceComparison } from '@/lib/actions/similarity';

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
      pageSize: 50, // Get enough to analyze category distribution
    });

    // Extract unique categories from results, skipping uncategorized products
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

    // Sort by count descending, take top 5
    const suggestions = Array.from(categoryMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      suggestions,
      totalProducts: result.count,
    };
  },
});
