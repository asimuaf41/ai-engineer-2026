// useCSSVariable can return a string, a number or nothing. Navigation and native props want a color string.
export function asColor(value: string | number | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}
