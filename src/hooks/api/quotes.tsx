import { FetchError } from "@medusajs/js-sdk"
import {
  QueryKey,
  useMutation,
  useQuery,
  UseQueryOptions,
} from "@tanstack/react-query"

import { fetchQuery } from "../../lib/client"
import { queryClient } from "../../lib/query-client"
import { queryKeysFactory } from "../../lib/query-key-factory"

/**
 * Seller RFQ (request-for-quote) inbox. Read-only.
 * Proxied by the marketplace backend `GET /vendor/enquiries` to the
 * tese-backend `storefront_enquiries` collection (source of truth), scoped
 * to the authenticated seller. Response shape: { items, pagination }.
 */

const QUOTES_QUERY_KEY = "vendor-quotes" as const
export const quotesQueryKeys = queryKeysFactory(QUOTES_QUERY_KEY)

export type QuoteTarget = {
  _id?: string
  sellerId?: string
  productTitle?: string
  productHandle?: string
  status?: string
  quotedAmount?: number | null
  quotedCurrency?: string
  quotedAt?: string
}

export type Quote = {
  enquiryId: string
  title?: string
  requirement?: string
  status?: string
  buyerName?: string
  createdAt?: string
  sentAt?: string
  targets?: QuoteTarget[]
}

export type QuotesResponse = {
  items: Quote[]
  pagination?: { total: number; page: number; size: number }
}

export type SubmitQuoteInput = {
  enquiryId: string
  quotedAmount: number
  quotedCurrency: string
  quoteNotes?: string
}

/**
 * Submit (or revise) this seller's quote on an RFQ enquiry. Proxied to
 * tese-backend, which owns storefront_enquiries.
 */
export const useSubmitQuote = () =>
  useMutation({
    mutationFn: ({ enquiryId, ...body }: SubmitQuoteInput) =>
      fetchQuery(`/vendor/enquiries/${enquiryId}/quote`, {
        method: "POST",
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quotesQueryKeys.all })
    },
  })

export const useQuotes = (
  query?: { page?: number; size?: number },
  options?: Omit<
    UseQueryOptions<QuotesResponse, FetchError, QuotesResponse, QueryKey>,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: quotesQueryKeys.list(query),
    queryFn: async () =>
      fetchQuery("/vendor/enquiries", {
        method: "GET",
        query: query as Record<string, string | number>,
      }) as Promise<QuotesResponse>,
    ...options,
  })

  return {
    quotes: data?.items ?? [],
    pagination: data?.pagination,
    ...rest,
  }
}
