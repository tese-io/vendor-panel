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
/**
 * Known category prefixes → human labels. Fallbacks to the raw prefix
 * when we hit a code we don't have a friendly name for, so unknown
 * verticals still render meaningfully. Kept alongside the helper so
 * the mapping stays with the grouping logic that uses it.
 */
const CATEGORY_LABELS: Record<string, string> = {
  ADAC: "Climate Adaptation",
  "TOU-ADAC": "Tourism Adaptation",
  "TOU-CT-ADAC": "Coastal Tourism Adaptation",
  HTBDAC: "Habitat & Biodiversity",
  HTBAC: "Habitat & Biodiversity",
  MIAC: "Climate Mitigation",
  MIAG: "Agriculture Mitigation",
  REAC: "Ecosystem Restoration",
  TF: "Tourism / Forest",
  T1: "Terrestrial",
  T2: "Terrestrial",
  F1: "Forestry",
  F2: "Forestry",
  MIAC_LU: "Land-Use Mitigation",
}

/**
 * Extract the category prefix from an activity code. Activity codes
 * follow the pattern `<PREFIX>-<digits...>` where PREFIX may itself
 * contain hyphens (e.g. "TOU-ADAC-01.01" → prefix "TOU-ADAC"). The
 * boundary is the first hyphen that's followed by a digit.
 *
 * Examples:
 *   "ADAC-13.04"           → "ADAC"
 *   "TOU-ADAC-01.01"       → "TOU-ADAC"
 *   "TOU-CT-ADAC-01.01"    → "TOU-CT-ADAC"
 *   "HTBDAC-01.01.01.01"   → "HTBDAC"
 *
 * If no hyphen-digit boundary is found (unexpected shape), return the
 * whole code as its own category so nothing gets silently misgrouped.
 */
export const extractCategoryPrefix = (activityCode: string): string => {
  const match = activityCode.match(/^(.+?)-\d/)
  return match ? match[1] : activityCode
}

export type CategoryGroup = {
  category_code: string
  category_label: string
  activities: GroupedActivity[]
  totalActivities: number
  totalSelfDeclared: number
  totalViaProductsOnly: number
}

/**
 * Second-level grouping: bucket the per-activity groups into their
 * category prefix. Purely presentational — the recommender still queries
 * per activity code; this just gives the seller a scan-friendly hierarchy
 * when they have coverage across many verticals.
 *
 * Category sort: alphabetical by human label. Activities inside each
 * category retain their groupByActivity order (self-declared first,
 * then alphabetical).
 */
export const groupByCategory = (
  groups: GroupedActivity[]
): CategoryGroup[] => {
  const map = new Map<string, CategoryGroup>()
  for (const g of groups) {
    const prefix = extractCategoryPrefix(g.activity_code)
    const existing = map.get(prefix)
    const isViaProductsOnly = !g.hasSelfDeclared && g.productCount > 0
    if (existing) {
      existing.activities.push(g)
      existing.totalActivities += 1
      if (g.hasSelfDeclared) existing.totalSelfDeclared += 1
      if (isViaProductsOnly) existing.totalViaProductsOnly += 1
    } else {
      map.set(prefix, {
        category_code: prefix,
        category_label: CATEGORY_LABELS[prefix] || prefix,
        activities: [g],
        totalActivities: 1,
        totalSelfDeclared: g.hasSelfDeclared ? 1 : 0,
        totalViaProductsOnly: isViaProductsOnly ? 1 : 0,
      })
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.category_label.localeCompare(b.category_label)
  )
}

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
