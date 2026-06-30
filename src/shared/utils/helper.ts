export function updateHeadingStack(
  stack: string[],
  level: number,
  heading: string,
) {
  stack.length = level - 1;

  stack.push(heading);

  return [...stack];
}

export function extractPromptIds(answer: string): string[] {
  const matches = answer.match(/\[D\d+\]/g) ?? [];

  return [...new Set(matches.map((match) => match.slice(1, -1)))];
}
