import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { useOnboarding, useOrders } from "../../hooks/api"
import { useMe } from "../../hooks/api/users"
import {
  shouldShowWizard,
  wizardDismissalKey,
} from "../onboarding/helpers/wizard-steps"
import { BusinessVerificationBanner } from "./components/business-verification-banner"
import { DashboardCharts } from "./components/dashboard-charts"
import { DashboardOnboarding } from "./components/dashboard-onboarding"
import { MatchabilityCard } from "./components/matchability-card"
import { ChartSkeleton } from "./components/chart-skeleton"
import { useReviews } from "../../hooks/api/review"

function wizardDismissed(sellerId: string | undefined): boolean {
  if (!sellerId) return true
  try {
    return localStorage.getItem(wizardDismissalKey(sellerId)) === "1"
  } catch {
    return true
  }
}

export const Dashboard = () => {
  const [isClient, setIsClient] = useState(false)
  useEffect(() => setIsClient(true), [])

  const { onboarding, isError, error, isPending } = useOnboarding()
  const { seller } = useMe()

  const { orders, isPending: isPendingOrders } = useOrders()
  const { reviews, isPending: isPendingReviews } = useReviews()

  const notFulfilledOrders =
    orders?.filter((order) => order.fulfillment_status === "not_fulfilled")
      .length || 0
  const fulfilledOrders =
    orders?.filter((order) => order.fulfillment_status === "fulfilled")
      .length || 0
  const reviewsToReply =
    reviews?.filter((review: any) => !review?.seller_note).length || 0

  if (!isClient) return null

  if (isPending || isPendingOrders || isPendingReviews) {
    return (
      <div>
        <ChartSkeleton />
      </div>
    )
  }

  if (isError) {
    throw error
  }

  const flags = onboarding
    ? {
        products: Boolean(onboarding.products),
        locations_shipping: Boolean(onboarding.locations_shipping),
        store_information: Boolean(onboarding.store_information),
        stripe_connection: Boolean(
          onboarding.stripe_connection ?? onboarding.stripe_connect
        ),
      }
    : null

  const coreDone =
    Boolean(onboarding?.products) &&
    Boolean(onboarding?.locations_shipping) &&
    Boolean(onboarding?.store_information)

  // B-02 gate: a genuinely blank store (all four flags false — the
  // SSO-provisioned case) that hasn't dismissed the wizard gets the
  // guided setup instead of an empty dashboard.
  if (shouldShowWizard(flags, wizardDismissed(seller?.id))) {
    return <Navigate to="/onboarding" replace />
  }

  // Checklist v2 always renders (it collapses to a slim success line when
  // everything is complete); the matchability card and charts join once
  // the core flags are done.
  return (
    <div className="flex flex-col gap-y-4">
      <BusinessVerificationBanner />
      <DashboardOnboarding flags={flags} />
      {coreDone && <MatchabilityCard />}
      {coreDone && (
        <DashboardCharts
          notFulfilledOrders={notFulfilledOrders}
          fulfilledOrders={fulfilledOrders}
          reviewsToReply={reviewsToReply}
        />
      )}
    </div>
  )
}
