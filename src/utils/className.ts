/**
 * Returns a `className` string with the given classes.
 *
 * If a mapping is given, the boolean value represents whether to include the
 * class.
 */
export function makeClassName(
  classNames: string[] | { [key: string]: boolean }
): string {
  if (Array.isArray(classNames)) {
    return classNames.join(" ");
  }
  return Object.entries(classNames)
    .flatMap(([className, include]) => (include ? [className] : []))
    .join(" ");
}
