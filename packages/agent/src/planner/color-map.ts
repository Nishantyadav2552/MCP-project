const COLOR_NAMES: Record<string, string> = {
  "light beige": "#FAF0E6",
  beige: "#F5F5DC",
  "light blue": "#38BDF8",
  "dark blue": "#1E3A8A",
  navy: "#000080",
  blue: "#0000FF",
  "dark red": "#991B1B",
  red: "#EF4444",
  "dark green": "#065F46",
  green: "#10B981",
  yellow: "#EAB308",
  orange: "#F97316",
  purple: "#A855F7",
  pink: "#EC4899",
  white: "#FFFFFF",
  black: "#000000",
  "dark gray": "#374151",
  "light gray": "#E5E7EB",
  gray: "#6B7280",
  grey: "#6B7280",
};

/**
 * Resolves a color term or hex string from a natural language instruction.
 * Multi-word color names are checked before single-word names.
 */
export function resolveColorHex(input: string): string | null {
  const hexMatch = input.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})/);
  if (hexMatch) {
    if (hexMatch[1].length === 3) {
      const c = hexMatch[1];
      return `#${c[0]}${c[0]}${c[1]}${c[1]}${c[2]}${c[2]}`.toUpperCase();
    }
    return `#${hexMatch[1]}`.toUpperCase();
  }

  const lower = input.toLowerCase();
  // Sort keys by length descending to match longer phrases first (e.g. "light beige" before "beige")
  const sortedNames = Object.keys(COLOR_NAMES).sort((a, b) => b.length - a.length);

  for (const name of sortedNames) {
    const regex = new RegExp(`\\b${name}\\b`, "i");
    if (regex.test(lower)) {
      return COLOR_NAMES[name];
    }
  }

  return null;
}
