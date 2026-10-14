import { Alert, Button, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { useBusinessVerification } from "../../../hooks/api/business-verification"

/**
 * B-27: the "verification needed" / "declined" states surfaced on the
 * dashboard, with the one-line why. Silent while under review and once
 * verified — being a real business is table stakes, not a badge (G-11).
 */
export const BusinessVerificationBanner = () => {
  const { t } = useTranslation()
  const { data } = useBusinessVerification()
  const state = data?.state
  if (!state || state === "verified" || state === "under_review") {
    return null
  }
  const declined = state === "declined"
  const note = data?.current?.reviewer_note

  return (
    <Alert
      variant={declined ? "error" : "warning"}
      data-testid={`business-verification-banner-${state}`}
    >
      <div className="flex flex-col gap-y-2 sm:flex-row sm:items-center sm:justify-between sm:gap-x-4">
        <div className="flex flex-col gap-y-0.5">
          <Text size="small" weight="plus">
            {declined
              ? t("businessVerification.states.declined.title")
              : t("businessVerification.states.needed.title")}
          </Text>
          <Text size="small">
            {declined && note ? note : t("businessVerification.states.needed.body")}
          </Text>
          <Text size="xsmall" className="text-ui-fg-subtle">
            {t("businessVerification.why")}
          </Text>
        </div>
        <Button size="small" variant="secondary" asChild>
          <Link to="/settings/business-verification" data-testid="business-verification-banner-cta">
            {t("businessVerification.actions.goToVerification")}
          </Link>
        </Button>
      </div>
    </Alert>
  )
}
