import { Badge, Button, Container, Heading, StatusBadge, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import {
  useMatchability,
  type MatchabilitySignal,
} from "../../../hooks/api/matchability"

/**
 * B-09 — "How buyers find you". Every row names the CONSEQUENCE, not
 * the gap (Kuzi's acceptance criterion), with a fix link straight to
 * the screen that closes it. Hidden entirely on endpoint failure —
 * a broken score is worse than none.
 */

const SIGNAL_LINKS: Record<MatchabilitySignal["key"], string> = {
  coverage: "/settings/activities-served",
  geo: "/settings/locations",
  contact_email: "/settings/store",
  prices: "/products",
  products: "/products/create",
  images: "/products",
  ship_to: "/settings/locations",
  certifications: "/settings/certifications",
}

const STATUS_COLOR: Record<MatchabilitySignal["status"], "green" | "orange" | "red" | "grey"> = {
  ok: "green",
  partial: "orange",
  missing: "red",
  unknown: "grey",
}

export const MatchabilityCard = () => {
  const { t } = useTranslation()
  const { matchability, isPending, isError } = useMatchability()

  if (isError || (!isPending && !matchability)) {
    return null
  }

  if (isPending) {
    return (
      <Container className="p-6" data-testid="matchability-skeleton">
        <div className="bg-ui-bg-component h-16 w-full animate-pulse rounded-lg" />
      </Container>
    )
  }

  const { score, signals, tese_verified } = matchability!

  return (
    <Container className="divide-y p-0" data-testid="matchability-card">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <div className="flex items-center gap-x-2">
            <Heading>{t("matchability.title")}</Heading>
            {tese_verified && (
              <StatusBadge color="green">{t("verifiedBadge.label")}</StatusBadge>
            )}
          </div>
          <Text size="small" className="text-ui-fg-subtle">
            {t("matchability.subtitle")}
          </Text>
        </div>
        <Badge size="large" data-testid="matchability-score">
          {t("matchability.score", { score })}
        </Badge>
      </div>
      <div className="divide-y px-6 py-2">
        {signals.map((signal) => (
          <div
            key={signal.key}
            className="flex items-center justify-between gap-4 py-2.5"
            data-testid={`matchability-signal-${signal.key}`}
          >
            <div className="flex items-center gap-3">
              <StatusBadge color={STATUS_COLOR[signal.status]}>
                {t(`matchability.status.${signal.status}`)}
              </StatusBadge>
              <div>
                <Text size="small" weight="plus">
                  {t(`matchability.signals.${signal.key}.title`)}
                </Text>
                <Text size="xsmall" className="text-ui-fg-subtle">
                  {t(`matchability.signals.${signal.key}.consequence`)}
                  {signal.detail && signal.detail.total > 0 && (
                    <>
                      {" · "}
                      {t("matchability.detail", {
                        done: signal.detail.done,
                        total: signal.detail.total,
                      })}
                    </>
                  )}
                </Text>
              </div>
            </div>
            {signal.status !== "ok" && signal.status !== "unknown" && (
              <Button size="small" variant="secondary" asChild>
                <Link to={SIGNAL_LINKS[signal.key]}>
                  {t("matchability.fix")}
                </Link>
              </Button>
            )}
          </div>
        ))}
      </div>
    </Container>
  )
}
