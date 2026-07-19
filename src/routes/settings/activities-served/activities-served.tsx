import { useMemo, useState } from "react"
import { Container, Heading, Text, Button, Input, Badge, toast } from "@medusajs/ui"
import { SingleColumnPage } from "../../../components/layout/pages/single-column-page"
import {
  useSellerCoverage,
  useActivitySearch,
  useAddSellerCoverage,
  useRemoveSellerCoverage,
  type ActivityHit,
  type CoverageRow,
} from "../../../hooks/api/vendor-coverage"

/**
 * Settings → Activities I serve (P3.3/P3.4).
 *
 * Sellers declare which sustainability activities they cover. Each row
 * writes a `vendor_coverage` document (subject.kind='seller', source=
 * 'self_declared', confidence=1.0). Recommendations for a project's
 * activity list surface sellers with matching coverage rows.
 */

// ─────────────────────────────────────────────────────────────────────
// Add-row: search-as-you-type + inline picker
// ─────────────────────────────────────────────────────────────────────

const AddCoverageRow = ({
  existingCodes,
}: {
  existingCodes: Set<string>
}) => {
  const [query, setQuery] = useState("")
  const [openList, setOpenList] = useState(false)

  const trimmed = query.trim()
  const { data, isLoading, isError } = useActivitySearch(trimmed)
  const suggestions: ActivityHit[] = data?.activities || []

  const add = useAddSellerCoverage({
    onSuccess: () => {
      toast.success("Added to your activities")
      setQuery("")
      setOpenList(false)
    },
    onError: (err: any) => {
      toast.error(err?.message || "Could not add activity")
    },
  })

  const submit = (code: string) => {
    if (!code) return
    if (existingCodes.has(code)) {
      toast.info("You already cover that activity")
      return
    }
    add.mutate({ activity_code: code })
  }

  return (
    <div className="px-6 py-4 border-b border-ui-border-base">
      <Text size="small" weight="plus" className="mb-2 text-ui-fg-subtle">
        Add an activity you serve
      </Text>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            placeholder="Search by activity name or code (e.g. rainwater or TOU-ADAC-01)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpenList(true)
            }}
            onFocus={() => setOpenList(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && suggestions[0]) {
                submit(suggestions[0].code)
              }
            }}
          />
          {openList && trimmed.length >= 2 && (
            <div className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-ui-border-base bg-ui-bg-base shadow-lg">
              {isLoading && (
                <div className="px-3 py-2 text-sm text-ui-fg-subtle">Searching…</div>
              )}
              {isError && (
                <div className="px-3 py-2 text-sm text-ui-fg-error">Search failed. Try again.</div>
              )}
              {!isLoading && !isError && suggestions.length === 0 && (
                <div className="px-3 py-2 text-sm text-ui-fg-subtle">No matches. Adjust your search.</div>
              )}
              {suggestions.map((a) => {
                const already = existingCodes.has(a.code)
                return (
                  <button
                    key={a.code}
                    type="button"
                    disabled={already || add.isPending}
                    onClick={() => submit(a.code)}
                    className={`w-full text-left px-3 py-2 text-sm border-b border-ui-border-base last:border-0 hover:bg-ui-bg-base-hover disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    <div className="font-mono text-xs text-ui-fg-subtle">{a.code}</div>
                    <div className="text-ui-fg-base">{a.name}</div>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {a.industry_vertical && (
                        <Badge size="2xsmall" color="grey">
                          {a.industry_vertical}
                        </Badge>
                      )}
                      {a.domain && (
                        <Badge size="2xsmall" color="grey">
                          {a.domain}
                        </Badge>
                      )}
                      {already && (
                        <Badge size="2xsmall" color="green">
                          Already added
                        </Badge>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <Text size="xsmall" className="mt-2 text-ui-fg-subtle">
        Adding an activity you serve makes your store show up when a Tese customer needs a vendor for that activity.
      </Text>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// One row in the list
// ─────────────────────────────────────────────────────────────────────

const CoverageRowItem = ({ row }: { row: CoverageRow }) => {
  const remove = useRemoveSellerCoverage({
    onSuccess: () => {
      toast.success("Removed")
    },
    onError: (err: any) => {
      toast.error(err?.message || "Could not remove")
    },
  })

  const sourceLabel =
    row.source === "self_declared"
      ? "You declared"
      : row.source === "admin_curated"
        ? "Tese-verified"
        : row.source === "ai_classified"
          ? "AI-classified"
          : row.source

  return (
    <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-ui-border-base last:border-0">
      <div className="min-w-0 flex-1">
        <div className="font-mono text-xs text-ui-fg-subtle">{row.activity_code}</div>
        <div className="mt-0.5 flex items-center gap-2">
          <Badge size="2xsmall" color={row.source === "self_declared" ? "green" : "grey"}>
            {sourceLabel}
          </Badge>
          {row.coverage_kind === "INDIRECT" && (
            <Badge size="2xsmall" color="grey">
              indirect
            </Badge>
          )}
        </div>
      </div>
      <Button
        variant="secondary"
        size="small"
        disabled={remove.isPending}
        onClick={() => remove.mutate(row.activity_code)}
      >
        {remove.isPending ? "Removing…" : "Remove"}
      </Button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────

export const ActivitiesServed = () => {
  const { data, isLoading, isError, error } = useSellerCoverage()

  const rows = data?.rows || []
  const existingCodes = useMemo(
    () => new Set(rows.map((r) => r.activity_code)),
    [rows]
  )

  return (
    <SingleColumnPage
      showMetadata={false}
      showJSON={false}
      widgets={{ before: [], after: [] }}
      hasOutlet={false}
    >
      <Container className="p-0 divide-y divide-ui-border-base">
        <div className="px-6 py-4">
          <Heading level="h2">Activities I serve</Heading>
          <Text size="small" className="mt-1 text-ui-fg-subtle">
            Tell Tese customers which sustainability activities your store covers.
            Recommendations for those activities will surface your products first.
          </Text>
        </div>

        <AddCoverageRow existingCodes={existingCodes} />

        <div>
          {isLoading && (
            <div className="px-6 py-4 text-sm text-ui-fg-subtle">Loading…</div>
          )}
          {isError && (
            <div className="px-6 py-4 text-sm text-ui-fg-error">
              Couldn't load your activities: {(error as any)?.message || "unknown error"}
            </div>
          )}
          {!isLoading && !isError && rows.length === 0 && (
            <div className="px-6 py-6 text-sm text-ui-fg-subtle">
              You haven't declared any activities yet. Use the search above to add one.
            </div>
          )}
          {rows.map((r) => (
            <CoverageRowItem key={r._id || r.activity_code} row={r} />
          ))}
        </div>
      </Container>
    </SingleColumnPage>
  )
}

export const Component = ActivitiesServed
