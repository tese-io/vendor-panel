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
 * Vendor-panel hooks for seller-attached sustainability certifications.
 *
 * Backed by Mercur — packages/modules/b2c-core/src/api/vendor/seller-certifications.
 * The certification catalog itself is proxied read-through from tese-backend
 * via /vendor/certifications (see hooks/api/certifications-catalog).
 */

export type CertificationDocument = {
  url: string
  filename?: string | null
  kind?: "file" | "url"
}

export type SellerCertificationRow = {
  id: string
  seller_id: string
  certification_slug: string
  // Preferred: multi-doc array. Falls back to document_url for pre-
  // migration rows so the UI never blanks out on legacy records.
  documents?: CertificationDocument[]
  document_url: string | null
  verification_status: "pending" | "verified" | "rejected" | "expired"
  verified_by: string | null
  verified_at: string | null
  verification_notes: string | null
  expires_at: string | null
  created_at?: string
  updated_at?: string
}

export type CatalogCertification = {
  slug: string
  name: string
  description: string
  categories: string[]
  websiteUrl: string | null
  logoUrl: string | null
  aliases: string[]
}

const KEY = ["seller-certifications"] as const

export const useSellerCertifications = (
  options?: Omit<
    UseQueryOptions<
      {
        seller_certifications: SellerCertificationRow[]
        count: number
        offset: number
        limit: number
      },
      FetchError,
      {
        seller_certifications: SellerCertificationRow[]
        count: number
        offset: number
        limit: number
      },
      any
    >,
    "queryFn" | "queryKey"
  >
) => {
  return useQuery({
    queryKey: KEY,
    queryFn: () =>
      fetchQuery("/vendor/seller-certifications", { method: "GET" }),
    ...options,
  })
}

export const useCertificationCatalog = (
  q: string,
  options?: Omit<
    UseQueryOptions<
      { certifications: CatalogCertification[]; count: number },
      FetchError,
      { certifications: CatalogCertification[]; count: number },
      any
    >,
    "queryFn" | "queryKey"
  >
) => {
  return useQuery({
    queryKey: ["vendor-certifications-catalog", q],
    queryFn: () =>
      fetchQuery("/vendor/certifications", {
        method: "GET",
        query: q ? { q } : undefined,
      }),
    staleTime: 60_000,
    ...options,
  })
}

// NOTE on the spread pattern below: extracting the caller's onSuccess
// (and onError) BEFORE the spread and re-invoking them AFTER the
// query invalidation is deliberate. React Query keeps only the last
// onSuccess defined on the mutation config — so `onSuccess: ...; ...options`
// silently clobbered our invalidation when the caller passed their own
// onSuccess (which they always do, for the toast + form reset). That's
// why the certifications list didn't refresh after attach until the
// page was manually reloaded.

export const useAttachSellerCertification = (
  options?: UseMutationOptions<
    { seller_certification: SellerCertificationRow },
    FetchError,
    {
      certification_slug: string
      documents: CertificationDocument[]
      expires_at?: string | null
    }
  >
) => {
  const { onSuccess: userOnSuccess, onError: userOnError, ...rest } = options || {}
  return useMutation({
    mutationFn: (payload) =>
      fetchQuery("/vendor/seller-certifications", {
        method: "POST",
        body: payload as Record<string, any>,
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: KEY })
      userOnSuccess?.(data, variables, context)
    },
    onError: (err, variables, context) => {
      userOnError?.(err, variables, context)
    },
    ...rest,
  })
}

export const useRemoveSellerCertification = (
  options?: UseMutationOptions<
    { id: string; deleted: boolean },
    FetchError,
    string
  >
) => {
  const { onSuccess: userOnSuccess, onError: userOnError, ...rest } = options || {}
  return useMutation({
    mutationFn: (id: string) =>
      fetchQuery(`/vendor/seller-certifications/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: KEY })
      userOnSuccess?.(data, variables, context)
    },
    onError: (err, variables, context) => {
      userOnError?.(err, variables, context)
    },
    ...rest,
  })
}
