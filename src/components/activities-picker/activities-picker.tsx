import { useState } from "react"

import { MagnifyingGlass, Trash } from "@medusajs/icons"
import { Badge, Button, Input, Select, Text, toast } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import {
  useActivitySearch,
  useAddSellerCoverage,
  useRemoveSellerCoverage,
  useSellerCoverage,
  type ActivityHit,
} from "../../hooks/api/vendor-coverage"
import {
  ALL,
  DOMAIN_OPTIONS,
  VERTICAL_OPTIONS,
  buildDeclaredRows,
  shouldShowResults,
} from "../../routes/settings/activities-served/activities-served-utils"

/**
 * B-03 (shell) — the shared "activities I serve" picker, used by the
 * first-run wizard and reusable by the settings screen.
 *
 * Selection today is search + category browse over the live taxonomy;
 * every selection writes a standard self-declared coverage row. The
 * named-groups layer from the naming pass slots in as an alternative
 * browse source when its data lands — the write path stays identical,
 * so recruitment doesn't wait for it.
 */
export const ActivitiesPicker = ({ compact = false }: { compact?: boolean }) => {
  const { t } = useTranslation()
  const [query, setQuery] = useState("")
  const [vertical, setVertical] = useState<string>(ALL)
  const [domain, setDomain] = useState<string>(ALL)

  const { data: coverage, isError: coverageError } = useSellerCoverage()
  const declared = buildDeclaredRows(
    (coverage?.rows || []).filter((r) => r.is_active !== false)
  )
  const declaredCodes = new Set(declared.map((r) => r.code))

  const active = shouldShowResults(query, vertical, domain)
  const { data, isLoading, isError } = useActivitySearch(query.trim(), {
    industry_vertical: vertical === ALL ? "" : vertical,
    domain: domain === ALL ? "" : domain,
  })
  const results: ActivityHit[] = active ? data?.activities || [] : []
  const hasMore = active && Boolean(data?.has_more)

  const add = useAddSellerCoverage({
    onSuccess: () => toast.success(t("activitiesPicker.added")),
    onError: (err: { message?: string }) =>
      toast.error(err?.message || t("activitiesPicker.addFailed")),
  })
  const remove = useRemoveSellerCoverage({
    onSuccess: () => toast.success(t("activitiesPicker.removed")),
    onError: (err: { message?: string }) =>
      toast.error(err?.message || t("activitiesPicker.removeFailed")),
  })

  return (
    <div className="flex flex-col gap-y-4" data-testid="activities-picker">
      <div>
        <Text size="small" weight="plus">
          {t("activitiesPicker.findTitle")}
        </Text>
        <Text size="xsmall" className="text-ui-fg-subtle">
          {t("activitiesPicker.findHint")}
        </Text>
      </div>

      <div className="flex flex-col gap-2 md:flex-row">
        <div className="flex-1">
          <Input
            placeholder={t("activitiesPicker.searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-testid="activities-picker-search"
          />
        </div>
        <div className="w-full md:w-44">
          <Select value={vertical} onValueChange={setVertical}>
            <Select.Trigger data-testid="activities-picker-vertical">
              <Select.Value placeholder={t("activitiesPicker.vertical")} />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value={ALL}>
                {t("activitiesPicker.allVerticals")}
              </Select.Item>
              {VERTICAL_OPTIONS.map((o) => (
                <Select.Item key={o.value} value={o.value}>
                  {t(`activitiesPicker.verticals.${o.value}`)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <div className="w-full md:w-44">
          <Select value={domain} onValueChange={setDomain}>
            <Select.Trigger data-testid="activities-picker-domain">
              <Select.Value placeholder={t("activitiesPicker.domain")} />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value={ALL}>
                {t("activitiesPicker.allDomains")}
              </Select.Item>
              {DOMAIN_OPTIONS.map((o) => (
                <Select.Item key={o.value} value={o.value}>
                  {t(`activitiesPicker.domains.${o.value}`)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
      </div>

      {active && (
        <div
          className="max-h-64 divide-y overflow-y-auto rounded-lg border"
          data-testid="activities-picker-results"
        >
          {isLoading ? (
            <div className="text-ui-fg-subtle flex items-center gap-2 p-3">
              <MagnifyingGlass />
              <Text size="small">{t("activitiesPicker.searching")}</Text>
            </div>
          ) : isError ? (
            <Text size="small" className="text-ui-fg-error p-3">
              {t("activitiesPicker.searchFailed")}
            </Text>
          ) : results.length === 0 ? (
            <Text size="small" className="text-ui-fg-subtle p-3">
              {t("activitiesPicker.noMatches")}
            </Text>
          ) : (
            <>
              {results.map((hit) => {
                const already = declaredCodes.has(hit.code)
                return (
                  <div
                    key={hit.code}
                    className="flex items-center justify-between gap-3 p-3"
                    data-testid={`activities-picker-result-${hit.code}`}
                  >
                    <div className="min-w-0">
                      <Text size="small" weight="plus">
                        {hit.name}
                      </Text>
                      {!compact && hit.description && (
                        <Text size="xsmall" className="text-ui-fg-subtle line-clamp-2">
                          {hit.description}
                        </Text>
                      )}
                      <div className="mt-1 flex flex-wrap gap-1">
                        {hit.industry_vertical && (
                          <Badge size="2xsmall" color="grey">
                            {t(
                              `activitiesPicker.verticals.${hit.industry_vertical}`,
                              hit.industry_vertical
                            )}
                          </Badge>
                        )}
                        {hit.domain && (
                          <Badge size="2xsmall" color="grey">
                            {t(
                              `activitiesPicker.domains.${hit.domain}`,
                              hit.domain
                            )}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      size="small"
                      variant="secondary"
                      disabled={already || add.isPending}
                      onClick={() => add.mutate({ activity_code: hit.code })}
                      data-testid={`activities-picker-add-${hit.code}`}
                    >
                      {already
                        ? t("activitiesPicker.addedLabel")
                        : t("activitiesPicker.add")}
                    </Button>
                  </div>
                )
              })}
              {hasMore && (
                <Text size="xsmall" className="text-ui-fg-subtle p-3">
                  {t("activitiesPicker.hasMore")}
                </Text>
              )}
            </>
          )}
        </div>
      )}

      <div>
        <Text size="small" weight="plus">
          {t("activitiesPicker.declaredTitle", { count: declared.length })}
        </Text>
        {coverageError ? (
          <Text size="small" className="text-ui-fg-error">
            {t("activitiesPicker.declaredFailed")}
          </Text>
        ) : declared.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            {t("activitiesPicker.declaredEmpty")}
          </Text>
        ) : (
          <div
            className="mt-2 flex flex-wrap gap-2"
            data-testid="activities-picker-declared"
          >
            {declared.map((row) => (
              <span
                key={row.key}
                className="bg-ui-bg-component inline-flex items-center gap-1 rounded-full py-1 pl-3 pr-1"
                data-testid={`activities-picker-declared-${row.code}`}
              >
                <Text size="xsmall">{row.name}</Text>
                {row.source === "self_declared" && (
                  <Button
                    size="small"
                    variant="transparent"
                    onClick={() => remove.mutate(row.code)}
                    disabled={remove.isPending}
                    data-testid={`activities-picker-remove-${row.code}`}
                  >
                    <Trash />
                  </Button>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
