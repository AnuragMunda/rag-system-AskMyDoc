export function updateHeadingStack(
  stack: string[],
  level: number,
  heading: string,
) {
  stack.length = level - 1;

  stack.push(heading);

  return [...stack];
}
