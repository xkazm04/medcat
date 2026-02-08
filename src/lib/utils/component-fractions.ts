/**
 * Component fraction estimation for set prices.
 *
 * When a reference price covers a complete surgical kit (SET), this estimates
 * what fraction of the total price an individual component represents.
 *
 * Based on published orthopedic implant cost breakdowns:
 * - Hip TEP: stem ~30-35%, cup ~15-20%, head ~10-15%, liner ~8-12%, fixation ~5-10%
 * - Knee TEP: femoral ~35-40%, tibial baseplate ~25-30%, insert ~10-15%, patellar ~5-8%
 *
 * These are rough estimates for UI context only — not for pricing decisions.
 */

// EMDN code prefixes mapped to estimated fraction of set price
const COMPONENT_FRACTION_MAP: Record<string, { fraction: [number, number]; label: string }> = {
  // ─── HIP COMPONENTS ───
  // Acetabular (cups)
  'P090803': { fraction: [0.15, 0.20], label: 'acetabular cup' },
  'P09080301': { fraction: [0.15, 0.20], label: 'acetabular cup' },
  'P09080302': { fraction: [0.15, 0.20], label: 'acetabular cup' },
  'P09080303': { fraction: [0.15, 0.20], label: 'acetabular cup' },
  'P09080304': { fraction: [0.15, 0.20], label: 'acetabular cup' },
  'P09080305': { fraction: [0.18, 0.22], label: 'dual-mobility cup' },
  // Femoral stems
  'P090801': { fraction: [0.30, 0.35], label: 'femoral stem' },
  'P09080101': { fraction: [0.30, 0.35], label: 'cemented stem' },
  'P09080102': { fraction: [0.30, 0.35], label: 'uncemented stem' },
  // Femoral heads
  'P090802': { fraction: [0.10, 0.15], label: 'femoral head' },
  // Liners/inserts
  'P0908030101': { fraction: [0.08, 0.12], label: 'acetabular liner' },
  'P09080399': { fraction: [0.08, 0.12], label: 'acetabular liner' },
  // Hemiarthroplasty
  'P090804': { fraction: [0.40, 0.50], label: 'femoral component (hemi)' },

  // ─── KNEE COMPONENTS ───
  // Femoral
  'P09090301': { fraction: [0.35, 0.40], label: 'femoral component' },
  'P0909030101': { fraction: [0.35, 0.40], label: 'cemented femoral' },
  'P0909030102': { fraction: [0.35, 0.40], label: 'uncemented femoral' },
  // Tibial
  'P09090302': { fraction: [0.25, 0.30], label: 'tibial component' },
  'P0909030201': { fraction: [0.20, 0.25], label: 'tibial baseplate' },
  'P0909030202': { fraction: [0.10, 0.15], label: 'tibial insert' },
  // Unicompartmental
  'P09090401': { fraction: [0.40, 0.50], label: 'unicondylar femoral' },
  'P09090402': { fraction: [0.35, 0.45], label: 'unicondylar tibial' },
  // Patellar
  'P09090702': { fraction: [0.05, 0.08], label: 'patellar component' },
  // Revision
  'P09090501': { fraction: [0.35, 0.40], label: 'revision femoral' },
  'P09090502': { fraction: [0.25, 0.30], label: 'revision tibial' },
  'P0909050201': { fraction: [0.20, 0.25], label: 'revision tibial plate' },
  'P0909050202': { fraction: [0.10, 0.15], label: 'revision tibial insert' },

  // ─── SHOULDER COMPONENTS ───
  'P090101': { fraction: [0.35, 0.45], label: 'humeral component' },
  'P090102': { fraction: [0.30, 0.40], label: 'glenoid component' },

  // ─── ACCESSORIES ───
  'P09098001': { fraction: [0.05, 0.10], label: 'augment' },
  'P09098006': { fraction: [0.08, 0.12], label: 'stem extension' },
}

/**
 * Estimate the component fraction of a set price for a product.
 *
 * @param productEmdnCode - The EMDN code of the product (e.g., "P09080301")
 * @param setPrice - The full set price in EUR
 * @returns Estimated price range for the component, or null if no estimate available
 */
export function estimateComponentPrice(
  productEmdnCode: string | null | undefined,
  setPrice: number
): { min: number; max: number; label: string; fractionMin: number; fractionMax: number } | null {
  if (!productEmdnCode) return null

  // Try progressively shorter prefixes (most specific first)
  for (let len = productEmdnCode.length; len >= 6; len--) {
    const prefix = productEmdnCode.substring(0, len)
    const entry = COMPONENT_FRACTION_MAP[prefix]
    if (entry) {
      return {
        min: Math.round(setPrice * entry.fraction[0]),
        max: Math.round(setPrice * entry.fraction[1]),
        label: entry.label,
        fractionMin: entry.fraction[0],
        fractionMax: entry.fraction[1],
      }
    }
  }

  return null
}

/**
 * Get a human-readable fraction range string (e.g., "15-20%").
 */
export function formatFractionRange(fractionMin: number, fractionMax: number): string {
  return `${Math.round(fractionMin * 100)}–${Math.round(fractionMax * 100)}%`
}
