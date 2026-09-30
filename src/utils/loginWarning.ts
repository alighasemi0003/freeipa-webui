/**
 * Normalize pre-auth login warning for safe plain-text display.
 * Empty / missing / whitespace-only values hide the banner.
 */
export function normalizeLoginWarning(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}
