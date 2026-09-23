import { CheckCircleSolid } from "@medusajs/icons"
import { StatusBadge, Tooltip } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

/**
 * B-12 — the tese Verified badge, finally visible to the vendor who
 * holds it. Grant stays manual (admin), with one precondition per the
 * revised D-03: at least one approved, unexpired certification.
 */
export const TeseVerifiedBadge = ({
  verified,
  compact = false,
}: {
  verified: boolean
  compact?: boolean
}) => {
  const { t } = useTranslation()

  if (!verified) {
    return null
  }

  if (compact) {
    return (
      <Tooltip content={t("verifiedBadge.tooltip")}>
        <CheckCircleSolid
          className="text-ui-tag-green-icon shrink-0"
          data-testid="tese-verified-badge-compact"
        />
      </Tooltip>
    )
  }

  return (
    <Tooltip content={t("verifiedBadge.tooltip")}>
      <StatusBadge color="green" data-testid="tese-verified-badge">
        {t("verifiedBadge.label")}
      </StatusBadge>
    </Tooltip>
  )
}
