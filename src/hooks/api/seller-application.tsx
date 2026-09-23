import { FetchError } from "@medusajs/js-sdk"
import { UseQueryOptions, useQuery } from "@tanstack/react-query"

import { fetchQuery } from "../../lib/client"

export type SellerApplication = {
  status: "received" | "under_review" | "approved" | "declined"
  submitted_at: string | null
  reviewed_at: string | null
  seller_name: string | null
  reviewer_note?: string
  claim: boolean
}

export type SellerApplicationResponse = {
  application: SellerApplication | null
}

const APPLICATION_QUERY_KEY = ["seller-application"] as const

/**
 * B-05: the caller's seller application state. Works for an
 * authenticated identity that is NOT yet an approved seller (the
 * endpoint is exempt from the approval gate).
 */
export const useSellerApplication = (
  options?: Omit<
    UseQueryOptions<SellerApplicationResponse, FetchError>,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery<SellerApplicationResponse, FetchError>({
    queryFn: () =>
      fetchQuery("/vendor/sellers/application", { method: "GET" }),
    queryKey: APPLICATION_QUERY_KEY,
    ...options,
  })

  return {
    application: data?.application ?? null,
    ...rest,
  }
}
