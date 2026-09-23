import { FetchError } from "@medusajs/js-sdk"
import { UseQueryOptions, useQuery } from "@tanstack/react-query"

import { fetchQuery } from "../../lib/client"

export type MatchabilitySignal = {
  key:
    | "coverage"
    | "geo"
    | "contact_email"
    | "prices"
    | "products"
    | "images"
    | "ship_to"
    | "certifications"
  status: "ok" | "partial" | "missing" | "unknown"
  detail?: { done: number; total: number }
}

export type MatchabilityResponse = {
  score: number
  tese_verified: boolean
  signals: MatchabilitySignal[]
}

/** B-09 — "How buyers find you", straight from what matching sees. */
export const useMatchability = (
  options?: Omit<
    UseQueryOptions<MatchabilityResponse, FetchError>,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery<MatchabilityResponse, FetchError>({
    queryFn: () =>
      fetchQuery("/vendor/sellers/me/matchability", { method: "GET" }),
    queryKey: ["matchability"],
    staleTime: 60_000,
    ...options,
  })

  return { matchability: data ?? null, ...rest }
}
