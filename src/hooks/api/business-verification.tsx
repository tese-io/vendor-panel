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
 * Vendor-panel hooks for business verification (KYB, B-23/B-27).
 * Backed by Mercur — packages/modules/b2c-core/src/api/vendor/business-verification.
 */

export type BusinessVerificationState =
  | "needed"
  | "under_review"
  | "declined"
  | "verified"

export type DocumentKind =
  | "certificate_of_incorporation"
  | "registration_extract"
  | "trade_licence"
  | "tax_registration"

export type BusinessVerificationRow = {
  id: string
  status: "pending" | "verified" | "rejected" | "archived"
  document_kind: DocumentKind
  document_filename: string | null
  legal_name: string
  registration_number: string
  country_of_registration: string
  reviewer_note: string | null
  reviewed_at: string | null
  created_at: string
}

export type BusinessVerificationResponse = {
  state: BusinessVerificationState
  current: BusinessVerificationRow | null
  history?: BusinessVerificationRow[]
}

export type OcrPrefill = {
  legal_name: string | null
  registration_number: string | null
  country_of_registration: string | null
  document_kind: DocumentKind | null
  confidence: number | null
}

export type SubmitBusinessVerificationPayload = {
  document_key: string
  document_url: string
  document_filename?: string | null
  document_kind: DocumentKind
  legal_name: string
  registration_number: string
  country_of_registration: string
  ocr_prefill?: OcrPrefill | null
}

export const BUSINESS_VERIFICATION_KEY = ["business-verification"] as const

export const useBusinessVerification = (
  options?: Omit<
    UseQueryOptions<
      BusinessVerificationResponse,
      FetchError,
      BusinessVerificationResponse,
      any
    >,
    "queryFn" | "queryKey"
  >
) =>
  useQuery({
    queryKey: BUSINESS_VERIFICATION_KEY,
    queryFn: () => fetchQuery("/vendor/business-verification", { method: "GET" }),
    ...options,
  })

export const useSubmitBusinessVerification = (
  options?: UseMutationOptions<
    BusinessVerificationResponse,
    FetchError,
    SubmitBusinessVerificationPayload
  >
) => {
  const { onSuccess: userOnSuccess, ...rest } = options || {}
  return useMutation({
    mutationFn: (payload) =>
      fetchQuery("/vendor/business-verification", {
        method: "POST",
        body: payload as Record<string, any>,
      }),
    // Compose — never let a caller's onSuccess clobber the invalidation.
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: BUSINESS_VERIFICATION_KEY })
      userOnSuccess?.(data, variables, context)
    },
    ...rest,
  })
}

export const usePrefillBusinessVerification = (
  options?: UseMutationOptions<
    { prefill: OcrPrefill | null; available: boolean },
    FetchError,
    { document_key: string; mime_type?: string | null }
  >
) =>
  useMutation({
    mutationFn: (payload) =>
      fetchQuery("/vendor/business-verification/prefill", {
        method: "POST",
        body: payload as Record<string, any>,
      }),
    ...options,
  })

/** One-shot signed link; never cached — it expires in minutes. */
export const fetchBusinessVerificationDocumentUrl = (): Promise<{
  url: string
  expires_in: number
}> => fetchQuery("/vendor/business-verification/document-url", { method: "GET" })
