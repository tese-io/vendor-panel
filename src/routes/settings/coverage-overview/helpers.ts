import type { AllCoverageRow } from "../../../hooks/api/vendor-coverage"

/**
 * Grouping helpers for the Coverage Overview page. Kept in a separate,
 * DOM-free module so the unit test can import them without dragging in
 * the API-client / window-dependent module tree.
 */

export type GroupedActivity = {
  activity_code: string
  rows: AllCoverageRow[]
  hasSelfDeclared: boolean
  productCount: number
}

/**
 * Group coverage rows by activity_code. Within each group we track:
 *   - hasSelfDeclared: true iff at least one row is a seller-level
 *     self-declared row (source=self_declared AND subject_kind=seller).
 *     Used to sort self-declared groups first + drive the "You declared"
 *     badge on the card.
 *   - productCount: number of product-level rows in the group. Drives
 *     the "N products" badge on the card.
 *
 * Inactive rows are filtered out entirely — the vendor doesn't need to
 * see stale rows that have been soft-deactivated.
 *
 * Sort order:
 *   1. Groups where hasSelfDeclared === true sort first (vendor's own
 *      declarations are highest priority).
 *   2. Within each tier, activity_code alphabetical.
 */
export const groupByActivity = (rows: AllCoverageRow[]): GroupedActivity[] => {
  const map = new Map<string, GroupedActivity>()
  for (const row of rows) {
    if (!row.is_active) continue
    const isSellerLevelSelfDeclared =
      row.source === "self_declared" && row.subject_kind === "seller"
    const isProductLevel = row.subject_kind === "product"
    const existing = map.get(row.activity_code)
    if (existing) {
      existing.rows.push(row)
      if (isSellerLevelSelfDeclared) existing.hasSelfDeclared = true
      if (isProductLevel) existing.productCount += 1
    } else {
      map.set(row.activity_code, {
        activity_code: row.activity_code,
        rows: [row],
        hasSelfDeclared: isSellerLevelSelfDeclared,
        productCount: isProductLevel ? 1 : 0,
      })
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.hasSelfDeclared !== b.hasSelfDeclared) return a.hasSelfDeclared ? -1 : 1
    return a.activity_code.localeCompare(b.activity_code)
  })
}
