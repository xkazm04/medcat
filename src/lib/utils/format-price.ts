/**
 * Memoized Intl.NumberFormat instances for price formatting.
 * Created once per locale, reused across all price renders for performance.
 *
 * Creating Intl.NumberFormat instances is expensive, so we create them once
 * and reuse them throughout the application.
 */
const priceFormatters: Record<string, Intl.NumberFormat> = {
  cs: new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }),
  en: new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "CZK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }),
};

/**
 * Formats a price value using the memoized formatter for the given locale.
 * @param price - The price to format (in CZK)
 * @param locale - The locale to use for formatting ('cs' or 'en')
 * @returns Formatted price string (e.g., "1 234 Kč" for cs, "CZK 1,234" for en)
 */
export function formatPrice(price: number, locale: string): string {
  const formatter = priceFormatters[locale] || priceFormatters.en;
  return formatter.format(price);
}

/**
 * Get the memoized price formatter for a specific locale.
 * Useful when you need the formatter instance directly.
 * @param locale - The locale to get the formatter for
 * @returns The Intl.NumberFormat instance for the locale
 */
export function getPriceFormatter(locale: string): Intl.NumberFormat {
  return priceFormatters[locale] || priceFormatters.en;
}

/**
 * Memoized multi-currency formatters keyed by currency code + locale.
 * Supports EUR, CZK, PLN, HUF, GBP, INR with locale-aware formatting.
 */
const currencyFormatters: Record<string, Record<string, Intl.NumberFormat>> = {
  EUR: {
    cs: new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 2 }),
    en: new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 2 }),
  },
  CZK: {
    cs: priceFormatters.cs,
    en: priceFormatters.en,
  },
  PLN: {
    cs: new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "PLN", minimumFractionDigits: 0, maximumFractionDigits: 2 }),
    en: new Intl.NumberFormat("en-US", { style: "currency", currency: "PLN", minimumFractionDigits: 0, maximumFractionDigits: 2 }),
  },
  HUF: {
    cs: new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "HUF", minimumFractionDigits: 0, maximumFractionDigits: 0 }),
    en: new Intl.NumberFormat("en-US", { style: "currency", currency: "HUF", minimumFractionDigits: 0, maximumFractionDigits: 0 }),
  },
  GBP: {
    cs: new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "GBP", minimumFractionDigits: 0, maximumFractionDigits: 2 }),
    en: new Intl.NumberFormat("en-US", { style: "currency", currency: "GBP", minimumFractionDigits: 0, maximumFractionDigits: 2 }),
  },
  INR: {
    cs: new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 2 }),
    en: new Intl.NumberFormat("en-US", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 2 }),
  },
};

/**
 * Format a price in any supported currency.
 * Uses memoized formatters for known currencies, falls back to dynamic Intl.NumberFormat.
 * @param price - The price amount
 * @param currency - ISO 4217 currency code (EUR, CZK, PLN, HUF, GBP, INR)
 * @param locale - The locale for formatting ('cs' or 'en')
 */
export function formatPriceWithCurrency(
  price: number,
  currency: string,
  locale: string
): string {
  const upper = currency.toUpperCase();
  const localeMap = currencyFormatters[upper];
  if (localeMap) {
    const formatter = localeMap[locale] || localeMap.en;
    return formatter.format(price);
  }
  // Fallback for unknown currencies (not memoized, but rare)
  return new Intl.NumberFormat(locale === "cs" ? "cs-CZ" : "en-US", {
    style: "currency",
    currency: upper,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
}
