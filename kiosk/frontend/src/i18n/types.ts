/**
 * Maps an English bundle to the shape every other locale must have: the same keys and the
 * same nesting, but any string value. Declaring `const ar: Localised<typeof en>` makes
 * `npm run typecheck` fail the moment a translation is missing, misspelled or left over.
 *
 * Every feature owns its own bundle pair, so Features 2 and 3 get the same guarantee by
 * writing one type annotation.
 */
export type Localised<T> = {
  -readonly [K in keyof T]: T[K] extends string ? string : Localised<T[K]>
}
