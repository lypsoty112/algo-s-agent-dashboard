export type FormattedValue = {
  mode: "markdown" | "json";
  content: string;
};

/**
 * Formats a tool call input or output value for display.
 * Returns null if the value is empty (should be skipped in rendering).
 */
export function formatToolValue(value: unknown): FormattedValue | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    return { mode: "markdown", content: value };
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    const keys = Object.keys(value as Record<string, unknown>);
    if (keys.length === 1) {
      return {
        mode: "markdown",
        content: String((value as Record<string, unknown>)[keys[0]]),
      };
    }
  }

  return { mode: "json", content: JSON.stringify(value, null, 2) };
}
