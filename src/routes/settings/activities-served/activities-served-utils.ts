/**
 * Pure display logic for Settings → Activities I serve. Kept free of
 * React so vitest covers it directly.
 */

export const ALL = "all" as const

/** Industry verticals present in the activity taxonomy (stable set). */
export const VERTICAL_OPTIONS = [
  { value: "TOU", label: "Tourism" },
  { value: "AGRI", label: "Agriculture" },
  { value: "NATURE", label: "Nature" },
] as const

/** Domains present in the activity taxonomy (stable set). */
export const DOMAIN_OPTIONS = [
  { value: "CLIMATE", label: "Climate" },
  { value: "NATURE", label: "Nature" },
  { value: "NBS", label: "Nature-based Solutions" },
] as const

const VERTICAL_LABELS: Record<string, string> = Object.fromEntries(
  VERTICAL_OPTIONS.map((o) => [o.value, o.label])
)
const DOMAIN_LABELS: Record<string, string> = Object.fromEntries(
  DOMAIN_OPTIONS.map((o) => [o.value, o.label])
)

export const verticalLabel = (code?: string | null): string | null =>
  code ? VERTICAL_LABELS[code] || code : null

export const domainLabel = (code?: string | null): string | null =>
  code ? DOMAIN_LABELS[code] || code : null

/**
 * The results panel opens when the vendor has given us ANYTHING to go
 * on: two typed characters, or a category filter (that's the browse
 * path for vendors who don't know what to type).
 */
export const shouldShowResults = (
  q: string,
  vertical: string,
  domain: string
): boolean =>
  q.trim().length >= 2 || (vertical !== ALL && !!vertical) || (domain !== ALL && !!domain)

export type SourceBadge = { label: string; color: "green" | "blue" | "purple" | "grey" }

/** Provenance → badge. Mirrors the trust-tier vocabulary used elsewhere. */
export const sourceBadge = (source: string): SourceBadge => {
  switch (source) {
    case "self_declared":
      return { label: "You declared", color: "green" }
    case "admin_curated":
      return { label: "Tese-verified", color: "blue" }
    case "ai_classified":
      return { label: "AI-classified", color: "purple" }
    case "llm_web_discovery":
      return { label: "AI-discovered", color: "grey" }
    default:
      return { label: source, color: "grey" }
  }
}

export type DeclaredRowVM = {
  key: string
  code: string
  name: string
  description: string | null
  vertical: string | null
  domain: string | null
  source: string
  indirect: boolean
}

type CoverageRowLike = {
  _id?: string
  activity_code: string
  activity_name?: string | null
  activity_description?: string | null
  industry_vertical?: string | null
  domain?: string | null
  source: string
  coverage_kind: "DIRECT" | "INDIRECT"
}

/**
 * Coverage rows → table view-models. Name falls back to the code when
 * catalog enrichment was unavailable; sorted alphabetically by display
 * name so the table reads like a list, not an insertion log.
 */
export const buildDeclaredRows = (rows: CoverageRowLike[]): DeclaredRowVM[] =>
  rows
    .map((r) => ({
      key: r._id || r.activity_code,
      code: r.activity_code,
      name: r.activity_name || r.activity_code,
      description: r.activity_description || null,
      vertical: r.industry_vertical || null,
      domain: r.domain || null,
      source: r.source,
      indirect: r.coverage_kind === "INDIRECT",
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
