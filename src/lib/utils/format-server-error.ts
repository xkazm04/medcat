/**
 * Extract a human-readable error message from a server action error response.
 * Handles formErrors (top-level), fieldErrors (per-field), and fallback.
 */
export function formatServerError(
  error: {
    formErrors?: string[];
    fieldErrors?: Record<string, string[]>;
  },
  fallback = "An error occurred"
): string {
  return (
    error.formErrors?.[0] ||
    Object.values(error.fieldErrors || {})
      .flat()
      .join(", ") ||
    fallback
  );
}
