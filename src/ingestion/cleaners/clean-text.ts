// This utility function cleans text by normalizing whitespace and removing excessive newlines.
export function cleanText(text: string) {
  return text
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}
