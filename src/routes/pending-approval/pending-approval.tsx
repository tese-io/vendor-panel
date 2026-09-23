import { Alert, Button, Heading, StatusBadge, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"

import AvatarBox from "../../components/common/logo-box/avatar-box"
import { useLogout } from "../../hooks/api/auth"
import { useSellerApplication } from "../../hooks/api/seller-application"
import { useDate } from "../../hooks/use-date"

const SUPPORT_EMAIL = "support@tese.io"

/**
 * B-05 — the applicant's home while their seller application is being
 * reviewed. Replaces the raw "Seller is not active" login error.
 */
export const PendingApproval = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { getFullDate } = useDate()
  const { application, isPending, error } = useSellerApplication()
  const { mutateAsync: logout } = useLogout()

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      navigate("/login", { replace: true })
    }
  }

  const badge = (() => {
    switch (application?.status) {
      case "approved":
        return { color: "green" as const, label: t("pendingApproval.approvedTitle") }
      case "declined":
        return { color: "red" as const, label: t("pendingApproval.declinedTitle") }
      default:
        return { color: "orange" as const, label: t("pendingApproval.receivedTitle") }
    }
  })()

  return (
    <div className="tese-auth-page flex min-h-dvh w-dvw items-center justify-center">
      <div
        className="tese-auth-card m-4 flex w-full max-w-md flex-col items-center"
        data-testid="pending-approval-card"
      >
        <AvatarBox />
        <Heading
          className="mb-1 text-center text-[rgb(var(--tese-ink))]"
          data-testid="pending-approval-title"
        >
          {t("pendingApproval.title")}
        </Heading>

        {isPending ? (
          <div
            className="bg-ui-bg-component mt-4 h-24 w-full animate-pulse rounded-lg"
            data-testid="pending-approval-skeleton"
          />
        ) : !application || error ? (
          <div className="mt-4 flex flex-col items-center gap-y-4" data-testid="pending-approval-empty">
            <Text size="small" className="text-ui-fg-subtle text-center">
              {t("pendingApproval.noApplication")}
            </Text>
            <Button variant="secondary" asChild data-testid="pending-approval-start-button">
              <Link to="/register">{t("pendingApproval.startApplication")}</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-4 flex w-full flex-col items-center gap-y-4">
            <StatusBadge color={badge.color} data-testid="pending-approval-status-badge">
              {badge.label}
            </StatusBadge>

            {application.seller_name && (
              <Text className="font-medium" data-testid="pending-approval-seller-name">
                {application.seller_name}
              </Text>
            )}

            <Text
              size="small"
              className="text-ui-fg-subtle text-center"
              data-testid="pending-approval-body"
            >
              {application.status === "approved"
                ? t("pendingApproval.approvedBody")
                : application.status === "declined"
                  ? t("pendingApproval.declinedBody")
                  : application.claim
                    ? t("pendingApproval.claimBody")
                    : t("pendingApproval.receivedBody")}
            </Text>

            {application.status === "declined" && application.reviewer_note && (
              <Alert variant="error" className="w-full" data-testid="pending-approval-reviewer-note">
                <Text size="small" className="font-medium">
                  {t("pendingApproval.reviewerReason")}
                </Text>
                <Text size="small">{application.reviewer_note}</Text>
              </Alert>
            )}

            <div className="text-center">
              {application.submitted_at && (
                <Text size="xsmall" className="text-ui-fg-muted" data-testid="pending-approval-submitted-on">
                  {t("pendingApproval.submittedOn", {
                    date: getFullDate({ date: application.submitted_at }),
                  })}
                </Text>
              )}
              {application.reviewed_at && (
                <Text size="xsmall" className="text-ui-fg-muted" data-testid="pending-approval-reviewed-on">
                  {t("pendingApproval.reviewedOn", {
                    date: getFullDate({ date: application.reviewed_at }),
                  })}
                </Text>
              )}
            </div>

            <div className="mt-2 flex w-full flex-col gap-y-2">
              {application.status === "approved" ? (
                <Button asChild className="tese-btn-primary w-full" data-testid="pending-approval-login-button">
                  <Link to="/login">{t("pendingApproval.goToLogin")}</Link>
                </Button>
              ) : (
                <Button variant="secondary" asChild className="w-full" data-testid="pending-approval-support-button">
                  <a href={`mailto:${SUPPORT_EMAIL}`}>
                    {t("pendingApproval.contactSupport")}
                  </a>
                </Button>
              )}
              <Button
                variant="transparent"
                className="w-full"
                onClick={handleLogout}
                data-testid="pending-approval-logout-button"
              >
                {t("pendingApproval.logOut")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
