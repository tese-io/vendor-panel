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

export type SellerCertificationRow = {
  id: string
  seller_id: string
  certification_slug: string
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

export const useAttachSellerCertification = (
  options?: UseMutationOptions<
    { seller_certification: SellerCertificationRow },
    FetchError,
    {
      certification_slug: string
      document_url?: string | null
      expires_at?: string | null
    }
  >
) => {
  return useMutation({
    mutationFn: (payload) =>
      fetchQuery("/vendor/seller-certifications", {
        method: "POST",
        body: payload as Record<string, any>,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY })
    },
    ...options,
  })
}

export const useRemoveSellerCertification = (
  options?: UseMutationOptions<
    { id: string; deleted: boolean },
    FetchError,
    string
  >
) => {
  return useMutation({
    mutationFn: (id: string) =>
      fetchQuery(`/vendor/seller-certifications/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY })
    },
    ...options,
  })
}
