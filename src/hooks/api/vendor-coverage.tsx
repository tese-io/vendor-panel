import { FetchError } from "@medusajs/js-sdk"
import {
  useMutation,
  UseMutationOptions,
  useQuery,
  UseQueryOptions,
} from "@tanstack/react-query"
import { fetchQuery } from "../../lib/client"
import { queryClient } from "../../lib/query-client"

/**
 * Hooks for the vendor coverage endpoints (P3.3/P3.4).
 * Mercur wraps tese-backend's coverage service — see
 * packages/modules/b2c-core/src/api/vendor/coverage/route.ts.
 */

export type CoverageRow = {
  _id?: string
  subject: { kind: string; id: string }
  activity_code: string
  coverage_kind: "DIRECT" | "INDIRECT"
  source: string
  confidence: number
  is_active: boolean
  createdAt?: string
  updatedAt?: string
}

export type ActivityHit = {
  code: string
  name: string
  industry_vertical?: string | null
  domain?: string | null
  subset?: string | null
}

const KEY = ["vendor-coverage"] as const

// ─────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────

export const useSellerCoverage = (
  options?: Omit<
    UseQueryOptions<{ rows: CoverageRow[]; count: number }, FetchError, { rows: CoverageRow[]; count: number }, any>,
    "queryFn" | "queryKey"
  >
) => {
  return useQuery({
    queryKey: KEY,
    queryFn: () => fetchQuery("/vendor/coverage", { method: "GET" }),
    ...options,
  })
}

/** Autocomplete activity codes. Sellers pick from these to add coverage. */
export const useActivitySearch = (
  q: string,
  options?: Omit<
    UseQueryOptions<{ activities: ActivityHit[]; count: number }, FetchError, { activities: ActivityHit[]; count: number }, any>,
    "queryFn" | "queryKey"
  >
) => {
  return useQuery({
    queryKey: ["vendor-activities-search", q],
    // Skip the network round-trip when the user hasn't typed anything meaningful yet.
    enabled: q.trim().length >= 2,
    queryFn: () =>
      fetchQuery("/vendor/activities/search", {
        method: "GET",
        query: { q, limit: 25 },
      }),
    staleTime: 60_000,
    ...options,
  })
}

// ─────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────

export const useAddSellerCoverage = (
  options?: UseMutationOptions<
    { row: CoverageRow; created: boolean },
    FetchError,
    { activity_code: string }
  >
) => {
  return useMutation({
    mutationFn: (payload) =>
      fetchQuery("/vendor/coverage", {
        method: "POST",
        body: payload as Record<string, any>,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY })
    },
    ...options,
  })
}

export const useRemoveSellerCoverage = (
  options?: UseMutationOptions<
    { matched: number; modified: number },
    FetchError,
    string
  >
) => {
  return useMutation({
    mutationFn: (activityCode: string) =>
      fetchQuery(`/vendor/coverage/${encodeURIComponent(activityCode)}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY })
    },
    ...options,
  })
}
