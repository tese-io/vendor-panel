import { useMemo, useState } from "react"
import { Container, Heading, Text, Badge } from "@medusajs/ui"
import { ChevronDownMini, ChevronRight } from "@medusajs/icons"
import { Link } from "react-router-dom"
import { SingleColumnPage } from "../../../components/layout/pages/single-column-page"
import { useAllSellerCoverage } from "../../../hooks/api/vendor-coverage"
import {
  groupByActivity,
  groupByCategory,
  type CategoryGroup,
  type GroupedActivity,
} from "./helpers"

/**
 * Settings → Coverage Overview.
 *
 * Read-only consolidated view of every vendor_coverage row for the current
 * seller — union of what the seller self-declared (Settings → Activities I
 * serve) AND what the AI classifier attached to each of their products.
 *
 * Why this page exists: before this, sellers could only see the activities
 * they explicitly declared. Product-level classifications happened silently
 * — a seller might be surfaced in buyer recommendations for a niche activity
 * without ever knowing. This page closes that visibility gap.
 *
 * Adds / removes still go through Settings → Activities I serve; this page
 * is intentionally read-only. Product-level classifications are managed by
 * editing the product (which re-fires the classifier) or by an admin action
 * in the coverage review queue.
 */

// ─────────────────────────────────────────────────────────────────────
// Source label + colour mapping
// ─────────────────────────────────────────────────────────────────────

const sourceMeta = (source: string): { label: string; color: "green" | "grey" | "blue" | "purple" | "orange" } => {
  switch (source) {
    case "self_declared":
      return { label: "You declared", color: "green" }
    case "admin_curated":
      return { label: "Tese-verified", color: "green" }
    case "ai_classified":
      return { label: "AI-classified", color: "blue" }
    case "llm_web_discovery":
      return { label: "AI-discovered", color: "blue" }
    case "interaction_signal":
      return { label: "Interaction", color: "grey" }
    default:
      return { label: source, color: "grey" }
  }
}

// ─────────────────────────────────────────────────────────────────────
// Grouped row: one activity code with all its source-provenance sub-rows
// ─────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────
// One row in the list
// ─────────────────────────────────────────────────────────────────────

const ActivityCard = ({ group }: { group: GroupedActivity }) => {
  const sellerRows = group.rows.filter((r) => r.subject_kind === "seller")
  const productRows = group.rows.filter((r) => r.subject_kind === "product")

  // Hide the seller-level sub-row section when it would just repeat the
  // top-level "You declared" badge verbatim. Concretely: there's exactly
  // one seller row and it's the self_declared one that already drove the
  // header badge. Any admin_curated / ai_classified seller row OR any
  // second row still shows in the sub-row list — those carry information
  // (source variant, coverage_kind INDIRECT, etc.) that the summary badge
  // doesn't convey.
  const suppressSellerSubRows =
    sellerRows.length === 1 &&
    sellerRows[0].source === "self_declared" &&
    sellerRows[0].coverage_kind !== "INDIRECT"

  return (
    <div className="px-6 py-4 border-b border-ui-border-base last:border-0">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-xs text-ui-fg-subtle" data-testid="activity-code">
            {group.activity_code}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {group.hasSelfDeclared && (
              <Badge size="2xsmall" color="green">
                You declared
              </Badge>
            )}
            {group.productCount > 0 && (
              <Badge size="2xsmall" color="blue">
                {group.productCount === 1
                  ? "1 product"
                  : `${group.productCount} products`}
              </Badge>
            )}
            {group.rows.some(
              (r) => r.subject_kind === "seller" && r.source === "admin_curated"
            ) && (
              <Badge size="2xsmall" color="green">
                Tese-verified
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Seller-level source rows (skipped when redundant with the header badge) */}
      {sellerRows.length > 0 && !suppressSellerSubRows && (
        <div className="pl-4 border-l-2 border-ui-border-base mt-2">
          {sellerRows.map((r, idx) => {
            const src = sourceMeta(r.source)
            return (
              <div
                key={r._id || `seller-${idx}`}
                className="flex items-center gap-2 py-1 text-xs text-ui-fg-subtle"
              >
                <Badge size="2xsmall" color={src.color}>
                  {src.label}
                </Badge>
                <span>at seller level</span>
                {r.coverage_kind === "INDIRECT" && (
                  <Badge size="2xsmall" color="grey">
                    indirect
                  </Badge>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Product-level source rows */}
      {productRows.length > 0 && (
        <div className="pl-4 border-l-2 border-ui-border-base mt-2">
          {productRows.map((r, idx) => {
            const src = sourceMeta(r.source)
            return (
              <div
                key={r._id || `product-${idx}`}
                className="flex items-center gap-2 py-1 text-xs text-ui-fg-subtle"
              >
                <Badge size="2xsmall" color={src.color}>
                  {src.label}
                </Badge>
                <span>via</span>
                {r.product_id ? (
                  <Link
                    to={`/products/${r.product_id}`}
                    className="text-ui-fg-interactive hover:underline truncate max-w-xs"
                    title={r.product_title || r.product_id}
                  >
                    {r.product_title || r.product_id}
                  </Link>
                ) : (
                  <span className="truncate max-w-xs" title={r.product_title || undefined}>
                    {r.product_title || "unknown product"}
                  </span>
                )}
                {typeof r.confidence === "number" && r.source === "ai_classified" && (
                  <Text size="xsmall" className="text-ui-fg-muted">
                    ({Math.round(r.confidence * 100)}% confidence)
                  </Text>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Category section — collapsible group of activity cards sharing a
// prefix (e.g. all ADAC-* activities land under "Climate Adaptation").
// ─────────────────────────────────────────────────────────────────────

const CategorySection = ({
  category,
  defaultOpen = true,
}: {
  category: CategoryGroup
  defaultOpen?: boolean
}) => {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-ui-border-base last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-6 py-3 text-left hover:bg-ui-bg-base-hover transition-colors"
        aria-expanded={open}
      >
        <span className="text-ui-fg-subtle shrink-0" aria-hidden>
          {open ? <ChevronDownMini /> : <ChevronRight />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-ui-fg-base">
            {category.category_label}
          </div>
          {category.category_label !== category.category_code && (
            <div className="font-mono text-xs text-ui-fg-muted mt-0.5">
              {category.category_code}-*
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <Badge size="2xsmall" color="grey">
            {category.totalActivities}{" "}
            {category.totalActivities === 1 ? "activity" : "activities"}
          </Badge>
          {category.totalSelfDeclared > 0 && (
            <Badge size="2xsmall" color="green">
              {category.totalSelfDeclared} declared
            </Badge>
          )}
          {category.totalViaProductsOnly > 0 && (
            <Badge size="2xsmall" color="blue">
              {category.totalViaProductsOnly} via products
            </Badge>
          )}
        </div>
      </button>
      {open && (
        <div className="border-t border-ui-border-base bg-ui-bg-subtle">
          {category.activities.map((g) => (
            <ActivityCard key={g.activity_code} group={g} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────

export const CoverageOverview = () => {
  const { data, isLoading, isError, error } = useAllSellerCoverage()

  const rows = data?.rows || []
  const groups = useMemo(() => groupByActivity(rows), [rows])
  const categories = useMemo(() => groupByCategory(groups), [groups])

  const totalActivities = groups.length
  const declaredCount = groups.filter((g) => g.hasSelfDeclared).length
  const viaProductsOnly = groups.filter((g) => !g.hasSelfDeclared && g.productCount > 0).length

  return (
    <SingleColumnPage
      showMetadata={false}
      showJSON={false}
      widgets={{ before: [], after: [] }}
      hasOutlet={false}
    >
      <Container className="p-0 divide-y divide-ui-border-base">
        <div className="px-6 py-4">
          <Heading level="h2">Coverage Overview</Heading>
          <Text size="small" className="mt-1 text-ui-fg-subtle">
            Every activity you're being surfaced for in buyer recommendations,
            with the reason each one shows up. Includes activities you explicitly
            declared AND activities the AI attached to your products. Read-only —
            manage self-declared activities in{" "}
            <Link to="/settings/activities-served" className="text-ui-fg-interactive hover:underline">
              Activities I serve
            </Link>
            .
          </Text>
          {!isLoading && !isError && rows.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge size="2xsmall" color="grey">
                {totalActivities} {totalActivities === 1 ? "activity" : "activities"} total
              </Badge>
              {declaredCount > 0 && (
                <Badge size="2xsmall" color="green">
                  {declaredCount} self-declared
                </Badge>
              )}
              {viaProductsOnly > 0 && (
                <Badge size="2xsmall" color="blue">
                  {viaProductsOnly} via products only
                </Badge>
              )}
            </div>
          )}
        </div>

        <div>
          {isLoading && (
            <div className="px-6 py-4 text-sm text-ui-fg-subtle">Loading…</div>
          )}
          {isError && (
            <div className="px-6 py-4 text-sm text-ui-fg-error">
              Couldn't load your coverage: {(error as any)?.message || "unknown error"}
            </div>
          )}
          {!isLoading && !isError && rows.length === 0 && (
            <div className="px-6 py-6 text-sm text-ui-fg-subtle">
              You're not currently surfaced for any activities. Add activities you
              serve in{" "}
              <Link to="/settings/activities-served" className="text-ui-fg-interactive hover:underline">
                Activities I serve
              </Link>
              , or publish products so the classifier can tag them for you.
            </div>
          )}
          {categories.map((c) => (
            <CategorySection key={c.category_code} category={c} />
          ))}
        </div>
      </Container>
    </SingleColumnPage>
  )
}

export const Component = CoverageOverview
