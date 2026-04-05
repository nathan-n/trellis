export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 1);
}

export function buildSearchTerms(...fields: (string | null | undefined)[]): string[] {
  const terms = new Set<string>();
  for (const field of fields) {
    if (field) {
      for (const token of tokenize(field)) {
        terms.add(token);
      }
    }
  }
  return Array.from(terms);
}
