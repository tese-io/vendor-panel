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
  // Display enrichment (Mercur joins the activity catalog server-side;
  // absent when the catalog lookup failed — render the code instead).
  activity_name?: string | null
  activity_description?: string | null
  industry_vertical?: string | null
  domain?: string | null
}

export type ActivityHit = {
  code: string
  name: string
  description?: string | null
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

// Consolidated coverage row (subject_kind + product context flattened).
// Sourced from GET /vendor/coverage/all — different shape than CoverageRow
// because Mercur enriches product-level rows with their originating
// product_title so the seller sees WHICH product triggered the surfacing.
export type AllCoverageRow = {
  _id?: string
  subject_kind: "seller" | "product"
  product_id: string | null
  product_title: string | null
  activity_code: string
  coverage_kind: "DIRECT" | "INDIRECT"
  source: string
  confidence: number
  is_active: boolean
}

/**
 * All coverage rows for the current seller — union of seller-declared and
 * product-classified rows. Backs the Settings → Coverage Overview page,
 * which is read-only (adds/removes still go through /vendor/coverage).
 */
export const useAllSellerCoverage = (
  options?: Omit<
    UseQueryOptions<{ rows: AllCoverageRow[]; count: number }, FetchError, { rows: AllCoverageRow[]; count: number }, any>,
    "queryFn" | "queryKey"
  >
) => {
  return useQuery({
    queryKey: [...KEY, "all"] as const,
    queryFn: () => fetchQuery("/vendor/coverage/all", { method: "GET" }),
    ...options,
  })
}

/**
 * Search / browse the activity catalog. Sellers pick from these to add
 * coverage. Works in two modes: typed search (q ≥ 2 chars) and category
 * browse (vertical/domain filter with no query) — the browse path is how
 * vendors who don't know the taxonomy discover what to declare.
 */
export const useActivitySearch = (
  q: string,
  filters?: { industry_vertical?: string; domain?: string },
  options?: Omit<
    UseQueryOptions<{ activities: ActivityHit[]; count: number; has_more?: boolean }, FetchError, { activities: ActivityHit[]; count: number; has_more?: boolean }, any>,
    "queryFn" | "queryKey"
  >
) => {
  const vertical = filters?.industry_vertical || ""
  const domain = filters?.domain || ""
  const hasQuery = q.trim().length >= 2
  return useQuery({
    queryKey: ["vendor-activities-search", q, vertical, domain],
    // Fire when there is anything to go on: text, or a browse filter.
    enabled: hasQuery || !!vertical || !!domain,
    queryFn: () =>
      fetchQuery("/vendor/activities/search", {
        method: "GET",
        query: {
          ...(hasQuery ? { q } : {}),
          ...(vertical ? { industry_vertical: vertical } : {}),
          ...(domain ? { domain } : {}),
          limit: 25,
        },
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
    ...options,
    // Compose, never let caller options REPLACE the invalidation — a
    // toast-only onSuccess used to clobber it, leaving the declared
    // list (and the wizard's Continue gate) stale until refocus.
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: KEY })
      options?.onSuccess?.(data, variables, context)
    },
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
    ...options,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: KEY })
      options?.onSuccess?.(data, variables, context)
    },
  })
}
