/**
 * Utilities for formatting EMDN category names for display.
 * EMDN names are often stored in ALL CAPS with redundant parent context.
 */

/**
 * Convert ALL CAPS text to Title Case, with smart handling of:
 * - Roman numerals (I, II, III, IV, etc.)
 * - Acronyms (keep short caps like "CT", "MRI")
 * - Connectors (and, or, of, etc.)
 */
export function toTitleCase(text: string): string {
  if (!text) return text;

  const connectors = new Set(['and', 'or', 'of', 'the', 'in', 'for', 'to', 'with', 'on', 'at', 'by']);
  const romanNumerals = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)$/i;
  const acronyms = /^[A-Z]{2,4}$/;

  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      // Keep Roman numerals uppercase
      if (romanNumerals.test(word)) {
        return word.toUpperCase();
      }
      // Keep short acronyms uppercase (if originally all caps)
      if (acronyms.test(word.toUpperCase()) && word.length <= 3) {
        return word.toUpperCase();
      }
      // Keep connectors lowercase (except at start)
      if (index > 0 && connectors.has(word)) {
        return word;
      }
      // Title case the word
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

/**
 * Remove redundant parent context from a category name.
 * E.g., "ORTHOPAEDIC PROSTHESES - HIP PROSTHESES" -> "Hip Prostheses"
 * when parent is "ORTHOPAEDIC PROSTHESES"
 */
export function simplifyChildName(childName: string, parentName?: string): string {
  let simplified = childName;

  if (parentName) {
    // Remove parent prefix if child starts with it
    const parentLower = parentName.toLowerCase();
    const childLower = childName.toLowerCase();

    // Try removing "PARENT - " prefix
    if (childLower.startsWith(parentLower + ' - ')) {
      simplified = childName.slice(parentName.length + 3);
    }
    // Try removing "PARENT, " prefix
    else if (childLower.startsWith(parentLower + ', ')) {
      simplified = childName.slice(parentName.length + 2);
    }
    // Try removing "PARENT " prefix (just space)
    else if (childLower.startsWith(parentLower + ' ') && childLower.length > parentLower.length + 5) {
      simplified = childName.slice(parentName.length + 1);
    }
  }

  // Remove leading connectors/punctuation
  simplified = simplified.replace(/^[-,\s]+/, '');

  return toTitleCase(simplified);
}

/**
 * Get a short display name for a category (for tree view).
 * Shows simplified name with title case formatting.
 */
export function getCategoryDisplayName(
  name: string,
  parentName?: string,
  showCode?: boolean,
  code?: string
): string {
  const displayName = simplifyChildName(name, parentName);

  if (showCode && code) {
    return `${code} · ${displayName}`;
  }

  return displayName;
}

/**
 * Format category path for breadcrumb display.
 * Takes path codes and returns formatted segments.
 */
export function formatCategoryPath(path: string): string[] {
  if (!path) return [];
  return path.split('/').filter(Boolean);
}
