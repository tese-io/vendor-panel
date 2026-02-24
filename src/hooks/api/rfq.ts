import { FetchError } from "@medusajs/js-sdk"
import { HttpTypes, PaginatedResponse } from "@medusajs/types"
import {
  QueryKey,
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
  useQuery,
} from "@tanstack/react-query"
import { fetchQuery } from "../../lib/client"
import { queryClient } from "../../lib/query-client"
import { queryKeysFactory } from "../../lib/query-key-factory"

const RFQ_QUERY_KEY = "vendor-rfq" as const
const QUOTATION_QUERY_KEY = "vendor-quotations" as const

export const rfqQueryKeys = queryKeysFactory(RFQ_QUERY_KEY)
export const quotationQueryKeys = queryKeysFactory(QUOTATION_QUERY_KEY)

export const useVendorRfqs = (
  query?: Record<string, any>,
  options?: Omit<
    UseQueryOptions<
      PaginatedResponse<{
        rfq_requests: any[]
      }>,
      FetchError,
      PaginatedResponse<{
        rfq_requests: any[]
      }>,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: rfqQueryKeys.list(query),
    queryFn: () =>
      fetchQuery("/vendor/rfq", {
        method: "GET",
        query: query as Record<string, string | number>,
      }),
    ...options,
  })

  return { ...data, ...rest }
}

export const useVendorRfq = (
  id: string,
  query?: Record<string, any>,
  options?: Omit<
    UseQueryOptions<
      { rfq_request: any },
      FetchError,
      { rfq_request: any },
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: rfqQueryKeys.detail(id, query),
    queryFn: () =>
      fetchQuery(`/vendor/rfq/${id}`, {
        method: "GET",
        query,
      }),
    ...options,
    enabled: !!id,
  })

  return { ...data, ...rest }
}

export const useCreateQuotation = (
  options?: UseMutationOptions<
    { quotation: any },
    FetchError,
    { rfqId: string; body: Record<string, unknown> }
  >
) => {
  return useMutation({
    mutationFn: (data) =>
      fetchQuery(`/vendor/rfq/${data.rfqId}/create-quote`, {
        method: "POST",
        body: data.body,
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: rfqQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: quotationQueryKeys.lists() })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useVendorQuotations = (
  query?: Record<string, any>,
  options?: Omit<
    UseQueryOptions<
      PaginatedResponse<{
        quotations: any[]
      }>,
      FetchError,
      PaginatedResponse<{
        quotations: any[]
      }>,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: quotationQueryKeys.list(query),
    queryFn: () =>
      fetchQuery("/vendor/quotations", {
        method: "GET",
        query: query as Record<string, string | number>,
      }),
    ...options,
  })

  return { ...data, ...rest }
}

export const useVendorQuotation = (
  id: string,
  query?: Record<string, any>,
  options?: Omit<
    UseQueryOptions<
      { quotation: any },
      FetchError,
      { quotation: any },
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: quotationQueryKeys.detail(id, query),
    queryFn: () =>
      fetchQuery(`/vendor/quotations/${id}`, {
        method: "GET",
        query,
      }),
    ...options,
    enabled: !!id,
  })

  return { ...data, ...rest }
}

export const useVendorQuotationStats = (
  options?: Omit<
    UseQueryOptions<
      { stats: any },
      FetchError,
      { stats: any },
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  return useQuery({
    queryKey: quotationQueryKeys.detail("stats"),
    queryFn: () =>
      fetchQuery("/vendor/quotations/stats", {
        method: "GET",
      }),
    ...options,
  })
}

export const useUpdateQuotation = (
  id: string,
  options?: UseMutationOptions<
    { quotation: any },
    FetchError,
    Record<string, unknown>
  >
) => {
  return useMutation({
    mutationFn: (payload) =>
      fetchQuery(`/vendor/quotations/${id}`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: quotationQueryKeys.lists() })
      queryClient.invalidateQueries({
        queryKey: quotationQueryKeys.detail(id),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useWithdrawQuotation = (
  options?: UseMutationOptions<any, FetchError, string>
) => {
  return useMutation({
    mutationFn: (id: string) =>
      fetchQuery(`/vendor/quotations/${id}`, {
        method: "DELETE",
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: quotationQueryKeys.lists() })
      queryClient.invalidateQueries({
        queryKey: quotationQueryKeys.detail(variables),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}
