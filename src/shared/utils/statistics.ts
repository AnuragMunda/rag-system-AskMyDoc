export const findMedian = (arr: number[]): number => {
  if (arr.length === 0) {
    throw new Error("Cannot calculate median of empty array");
  }

  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  // Return middle element (odd) or average of two middles (even)
  return sorted.length % 2 !== 0
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
};
