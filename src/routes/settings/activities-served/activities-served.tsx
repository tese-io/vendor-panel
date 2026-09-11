import { useMemo, useState } from "react"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Select,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { MagnifyingGlass, Trash } from "@medusajs/icons"
import { SingleColumnPage } from "../../../components/layout/pages/single-column-page"
import {
  useSellerCoverage,
  useActivitySearch,
  useAddSellerCoverage,
  useRemoveSellerCoverage,
  type ActivityHit,
} from "../../../hooks/api/vendor-coverage"
import {
  ALL,
  DOMAIN_OPTIONS,
  VERTICAL_OPTIONS,
  buildDeclaredRows,
  domainLabel,
  shouldShowResults,
  sourceBadge,
  verticalLabel,
} from "./activities-served-utils"

/**
 * Settings → Activities I serve (P3.3/P3.4).
 *
 * Sellers declare which sustainability activities they cover. Each row
 * writes a `vendor_coverage` document (subject.kind='seller', source=
 * 'self_declared', confidence=1.0). Recommendations for a project's
 * activity list surface sellers with matching coverage rows.
 *
 * Vendors rarely know the taxonomy codes, so the picker supports both
 * typed search AND category browse (vertical/domain filters), and every
 * result shows its human name + description — codes are secondary.
 */

// ─────────────────────────────────────────────────────────────────────
// Find & add activities
// ─────────────────────────────────────────────────────────────────────

const CategoryBadges = ({
  vertical,
  domain,
}: {
  vertical?: string | null
  domain?: string | null
}) => {
  const v = verticalLabel(vertical)
  const d = domainLabel(domain)
  if (!v && !d) return null
  return (
    <div className="flex flex-wrap gap-1">
      {v && (
        <Badge size="2xsmall" color="grey">
          {v}
        </Badge>
      )}
      {d && (
        <Badge size="2xsmall" color="grey">
          {d}
        </Badge>
      )}
    </div>
  )
}

const AddActivitiesSection = ({
  existingCodes,
}: {
  existingCodes: Set<string>
}) => {
  const [query, setQuery] = useState("")
  const [vertical, setVertical] = useState<string>(ALL)
  const [domain, setDomain] = useState<string>(ALL)

  const active = shouldShowResults(query, vertical, domain)
  const { data, isLoading, isError } = useActivitySearch(query.trim(), {
    industry_vertical: vertical === ALL ? "" : vertical,
    domain: domain === ALL ? "" : domain,
  })
  const results: ActivityHit[] = active ? data?.activities || [] : []

  const add = useAddSellerCoverage({
    onSuccess: () => {
      toast.success("Added to your activities")
    },
    onError: (err: any) => {
      toast.error(err?.message || "Could not add activity")
    },
  })

  return (
    <div className="px-6 py-4">
      <Text size="small" weight="plus">
        Find activities to add
      </Text>
      <Text size="xsmall" className="text-ui-fg-subtle mb-3">
        Search by name — or browse a category if you're not sure what to
        search for. Declaring an activity makes your store show up when a
        Tese customer needs a vendor for it.
      </Text>

      <div className="flex flex-col gap-2 md:flex-row">
        <div className="flex-1">
          <Input
            placeholder="Search — try “rainwater”, “solar”, “wetland”…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="w-full md:w-44">
          <Select value={vertical} onValueChange={setVertical}>
            <Select.Trigger>
              <Select.Value placeholder="Industry" />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value={ALL}>All industries</Select.Item>
              {VERTICAL_OPTIONS.map((o) => (
                <Select.Item key={o.value} value={o.value}>
                  {o.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <div className="w-full md:w-52">
          <Select value={domain} onValueChange={setDomain}>
            <Select.Trigger>
              <Select.Value placeholder="Topic" />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value={ALL}>All topics</Select.Item>
              {DOMAIN_OPTIONS.map((o) => (
                <Select.Item key={o.value} value={o.value}>
                  {o.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
      </div>

      {!active && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Text size="xsmall" className="text-ui-fg-subtle mr-1">
            Not sure where to start? Browse:
          </Text>
          {VERTICAL_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setVertical(o.value)}
              className="rounded-full border border-ui-border-base bg-ui-bg-subtle px-2.5 py-0.5 text-xs text-ui-fg-base hover:bg-ui-bg-base-hover"
            >
              {o.label}
            </button>
          ))}
          {DOMAIN_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setDomain(o.value)}
              className="rounded-full border border-ui-border-base bg-ui-bg-subtle px-2.5 py-0.5 text-xs text-ui-fg-base hover:bg-ui-bg-base-hover"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      {active && (
        <div className="mt-3 overflow-hidden rounded-lg border border-ui-border-base">
          {isLoading && (
            <div className="px-4 py-3 text-sm text-ui-fg-subtle">Searching…</div>
          )}
          {isError && (
            <div className="px-4 py-3 text-sm text-ui-fg-error">
              Search failed. Try again.
            </div>
          )}
          {!isLoading && !isError && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-ui-fg-subtle">
              No matches — try a broader word, or browse by category.
            </div>
          )}
          {results.length > 0 && (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>Activity</Table.HeaderCell>
                    <Table.HeaderCell className="w-44">Code</Table.HeaderCell>
                    <Table.HeaderCell className="w-48">Category</Table.HeaderCell>
                    <Table.HeaderCell className="w-24" />
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {results.map((a) => {
                    const already = existingCodes.has(a.code)
                    return (
                      <Table.Row key={a.code}>
                        <Table.Cell>
                          <div className="py-1">
                            <Text size="small" weight="plus" className="leading-snug">
                              {a.name}
                            </Text>
                            {a.description && (
                              <Text
                                size="xsmall"
                                className="text-ui-fg-subtle line-clamp-2 leading-snug"
                              >
                                {a.description}
                              </Text>
                            )}
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <span className="font-mono text-xs text-ui-fg-subtle">
                            {a.code}
                          </span>
                        </Table.Cell>
                        <Table.Cell>
                          <CategoryBadges
                            vertical={a.industry_vertical}
                            domain={a.domain}
                          />
                        </Table.Cell>
                        <Table.Cell>
                          {already ? (
                            <Badge size="2xsmall" color="green">
                              Added
                            </Badge>
                          ) : (
                            <Button
                              variant="secondary"
                              size="small"
                              disabled={add.isPending}
                              onClick={() => add.mutate({ activity_code: a.code })}
                            >
                              Add
                            </Button>
                          )}
                        </Table.Cell>
                      </Table.Row>
                    )
                  })}
                </Table.Body>
              </Table>
              {data?.has_more && (
                <div className="border-t border-ui-border-base px-4 py-2 text-xs text-ui-fg-subtle">
                  Showing the first {results.length} — refine your search to
                  see more specific activities.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Declared activities table
// ─────────────────────────────────────────────────────────────────────

const DeclaredTable = () => {
  const { data, isLoading, isError, error } = useSellerCoverage()
  const rows = useMemo(() => buildDeclaredRows(data?.rows || []), [data?.rows])

  const remove = useRemoveSellerCoverage({
    onSuccess: () => toast.success("Removed"),
    onError: (err: any) => toast.error(err?.message || "Could not remove"),
  })

  if (isLoading) {
    return <div className="px-6 py-4 text-sm text-ui-fg-subtle">Loading…</div>
  }
  if (isError) {
    return (
      <div className="px-6 py-4 text-sm text-ui-fg-error">
        Couldn't load your activities: {(error as any)?.message || "unknown error"}
      </div>
    )
  }
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 px-6 py-10 text-center">
        <MagnifyingGlass className="text-ui-fg-muted" />
        <Text size="small" weight="plus">
          No activities yet
        </Text>
        <Text size="xsmall" className="text-ui-fg-subtle max-w-sm">
          Use the search above — or browse a category — to declare what your
          store serves. Customers looking for those activities will see you
          first.
        </Text>
      </div>
    )
  }

  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Activity</Table.HeaderCell>
          <Table.HeaderCell className="w-44">Code</Table.HeaderCell>
          <Table.HeaderCell className="w-48">Category</Table.HeaderCell>
          <Table.HeaderCell className="w-36">Source</Table.HeaderCell>
          <Table.HeaderCell className="w-16" />
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {rows.map((r) => {
          const badge = sourceBadge(r.source)
          return (
            <Table.Row key={r.key}>
              <Table.Cell>
                <div className="py-1">
                  <Text size="small" weight="plus" className="leading-snug">
                    {r.name}
                  </Text>
                  {r.description && (
                    <Text
                      size="xsmall"
                      className="text-ui-fg-subtle line-clamp-1 leading-snug"
                    >
                      {r.description}
                    </Text>
                  )}
                </div>
              </Table.Cell>
              <Table.Cell>
                <span className="font-mono text-xs text-ui-fg-subtle">{r.code}</span>
              </Table.Cell>
              <Table.Cell>
                <CategoryBadges vertical={r.vertical} domain={r.domain} />
              </Table.Cell>
              <Table.Cell>
                <div className="flex flex-wrap gap-1">
                  <Badge size="2xsmall" color={badge.color}>
                    {badge.label}
                  </Badge>
                  {r.indirect && (
                    <Badge size="2xsmall" color="grey">
                      indirect
                    </Badge>
                  )}
                </div>
              </Table.Cell>
              <Table.Cell>
                <Button
                  variant="transparent"
                  size="small"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(r.code)}
                  aria-label={`Remove ${r.name}`}
                >
                  <Trash className="text-ui-fg-subtle" />
                </Button>
              </Table.Cell>
            </Table.Row>
          )
        })}
      </Table.Body>
    </Table>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────

export const ActivitiesServed = () => {
  const { data } = useSellerCoverage()
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
            Tell Tese customers which sustainability activities your store
            covers. Recommendations for those activities will surface your
            products first.
          </Text>
        </div>

        <AddActivitiesSection existingCodes={existingCodes} />

        <div>
          <div className="flex items-center justify-between px-6 py-3">
            <Text size="small" weight="plus">
              Your activities{rows.length > 0 ? ` (${rows.length})` : ""}
            </Text>
          </div>
          <DeclaredTable />
        </div>
      </Container>
    </SingleColumnPage>
  )
}

export const Component = ActivitiesServed
