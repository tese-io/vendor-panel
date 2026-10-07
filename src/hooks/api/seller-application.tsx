import { FetchError } from "@medusajs/js-sdk"
import {
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

import { fetchQuery } from "../../lib/client"

/** What a re-application starts from. Only ever sent on a declined one. */
export type SellerReapply = {
  name: string
  website: string | null
  company_type: string | null
  country_code: string | null
  member: { name: string; email: string }
}

export type SellerApplication = {
  status: "received" | "under_review" | "approved" | "declined"
  submitted_at: string | null
  reviewed_at: string | null
  seller_name: string | null
  reviewer_note?: string
  claim: boolean
  reapply?: SellerReapply
}

export type ReapplyPayload = {
  name: string
  website?: string
  company_type?: string
  country_code?: string
  member: { name: string; email: string }
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


/**
 * Submit a fresh application after a decline.
 *
 * Posts to the same endpoint a first-time signup uses — the guard there
 * blocks only a live or accepted request, so a rejected applicant has
 * always been allowed a second attempt. What was missing was any way to
 * make one: the status page gave them the reviewer's reason and then only
 * Contact support and Log out.
 *
 * No account is created here; the applicant is already signed in. This is
 * the second half of the signup hook, without the auth-register step.
 */
export const useReapplyForSeller = (
  options?: UseMutationOptions<void, FetchError, ReapplyPayload>
) => {
  const queryClient = useQueryClient()

  return useMutation<void, FetchError, ReapplyPayload>({
    mutationFn: (payload) =>
      fetchQuery("/vendor/sellers", { method: "POST", body: payload }),
    ...options,
    onSuccess: async (data, variables, context) => {
      // The status page must move off "declined" on its own — leaving the
      // old state on screen after a successful submit reads as a failure.
      await queryClient.invalidateQueries({ queryKey: APPLICATION_QUERY_KEY })
      await options?.onSuccess?.(data, variables, context)
    },
  })
}
