import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { sdk } from "../../lib/config"

const ESCROW_QUERY_KEY = "vendor-escrow"

export function useVendorEscrow(query?: Record<string, unknown>) {
  return useQuery({
    queryKey: [ESCROW_QUERY_KEY, query],
    queryFn: () =>
      sdk.client.fetch<{
        escrow_transactions: any[]
        count: number
        offset: number
        limit: number
      }>("/vendor/escrow", {
        method: "GET",
        query: query as Record<string, string>,
      }),
  })
}

export function useVendorEscrowDetail(id: string) {
  return useQuery({
    queryKey: [ESCROW_QUERY_KEY, id],
    queryFn: () =>
      sdk.client.fetch<{ escrow_transaction: any }>(`/vendor/escrow/${id}`, {
        method: "GET",
      }),
    enabled: !!id,
  })
}

export function useVendorEscrowStats() {
  return useQuery({
    queryKey: [ESCROW_QUERY_KEY, "stats"],
    queryFn: () =>
      sdk.client.fetch<{ stats: any }>("/vendor/escrow/stats", {
        method: "GET",
      }),
  })
}
