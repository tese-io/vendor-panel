import { useEffect, useRef } from "react"

import { Check } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Text, clx } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { useUpdateOnboarding } from "../../../hooks/api"
import { useMe } from "../../../hooks/api/users"
import { useProducts } from "../../../hooks/api/products"
import { useSellerCertifications } from "../../../hooks/api/seller-certifications"
import { useSellerCoverage } from "../../../hooks/api/vendor-coverage"
import {
  buildCompleteness,
  shouldRecalculateOnboarding,
  summarizePricing,
  type CompletenessInputs,
  type CompletenessRow,
} from "../helpers/onboarding-completeness"

type DashboardProps = {
  flags: {
    products: boolean
    locations_shipping: boolean
    store_information: boolean
    stripe_connection: boolean
  } | null
}

/** Placeholder emails minted by the data migration don't count. */
function normalizeContactEmail(email: string | null | undefined): string | null {
  const trimmed = (email || "").trim()
  if (!trimmed || trimmed.toLowerCase().endsWith("@migration.local")) {
    return null
  }
  return trimmed
}

function ChecklistRow({ row }: { row: CompletenessRow }) {
  const { t } = useTranslation()
  const done = row.done === true
  const unknown = row.done === null

  return (
    <div
      className="flex items-center justify-between gap-4 py-3"
      data-testid={`checklist-row-${row.key}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={clx(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
            {
              "border-dashed": !done,
              "border-current": done,
              "opacity-40": unknown,
            }
          )}
          data-testid={`checklist-row-${row.key}-state`}
        >
          {done && <Check />}
          {unknown && (
            <span className="text-ui-fg-muted text-xs">
              {t("dashboardChecklist.unknown")}
            </span>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <Heading className="text-sm">
              {t(`dashboardChecklist.rows.${row.key}.title`)}
            </Heading>
            {row.optional && (
              <Badge size="2xsmall" color="grey">
                {t("dashboardChecklist.optional")}
              </Badge>
            )}
          </div>
          <Text size="small" className="text-ui-fg-subtle">
            {t(`dashboardChecklist.rows.${row.key}.description`)}
            {row.detail && (
              <>
                {" · "}
                {t("dashboardChecklist.pricedDetail", {
                  priced: row.detail.priced,
                  total: row.detail.total,
                })}
              </>
            )}
          </Text>
        </div>
      </div>
      {!done && !unknown && (
        <Button
          size="small"
          variant="secondary"
          asChild
          data-testid={`checklist-row-${row.key}-action`}
        >
          <Link to={row.link}>
            {t(`dashboardChecklist.rows.${row.key}.action`)}
          </Link>
        </Button>
      )}
    </div>
  )
}

export const DashboardOnboarding = ({ flags }: DashboardProps) => {
  const { t } = useTranslation()
  const { mutateAsync: recalculate } = useUpdateOnboarding()
  const recalcTried = useRef(false)

  // Recalculate the backend flags when one is actually false — once per
  // dashboard VISIT, not per session: flags become satisfiable mid-session
  // (create a product, come back), and a session gate froze the checklist
  // until the tab closed. Self-limiting: all-true flags never re-POST.
  // Wait for flags to load before spending the once-per-mount shot.
  useEffect(() => {
    if (recalcTried.current || !flags) return
    recalcTried.current = true
    if (shouldRecalculateOnboarding(flags, false)) {
      recalculate().catch(() => undefined)
    }
  }, [flags, recalculate])

  const { seller } = useMe()
  const { data: coverage, isError: coverageError } = useSellerCoverage()
  const { data: certifications, isError: certsError } =
    useSellerCertifications()
  const { products, isError: productsError } = useProducts({
    fields: "id,variants.prices.amount",
    limit: 100,
  } as never)

  const inputs: CompletenessInputs = {
    flags,
    activityCount: coverageError
      ? null
      : coverage
        ? (coverage.rows || []).filter((r) => r.is_active !== false).length
        : null,
    contactEmail: seller ? normalizeContactEmail(seller.email) : null,
    pricing: productsError ? null : summarizePricing(products ?? null),
    certificationCount: certsError
      ? null
      : certifications
        ? (certifications.seller_certifications?.length ??
          certifications.count ??
          null)
        : null,
  }

  const completeness = buildCompleteness(inputs)

  if (completeness.allComplete) {
    return (
      <Container
        className="flex items-center gap-3 px-6 py-3"
        data-testid="checklist-complete-line"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-current">
          <Check />
        </div>
        <Text size="small">{t("dashboardChecklist.successLine")}</Text>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0" data-testid="checklist-card">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("dashboardChecklist.title")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {t("dashboardChecklist.subtitle")}
          </Text>
        </div>
        <Badge size="small" data-testid="checklist-progress-badge">
          {t("dashboardChecklist.progress", {
            done: completeness.done,
            known: completeness.known,
          })}
        </Badge>
      </div>
      <div className="px-6 pt-3" data-testid="checklist-progress-bar">
        <div className="bg-ui-bg-component h-1.5 w-full overflow-hidden rounded-full">
          <div
            className="bg-ui-fg-interactive h-full rounded-full transition-all"
            style={{ width: `${completeness.percent}%` }}
          />
        </div>
      </div>
      <div className="divide-y px-6 py-2">
        {completeness.rows.map((row) => (
          <ChecklistRow key={row.key} row={row} />
        ))}
      </div>
    </Container>
  )
}
