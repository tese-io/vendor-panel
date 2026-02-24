import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { sdk } from "../../lib/config"

const SERVICE_ORDER_QUERY_KEY = "vendor-service-orders"

export function useVendorServiceOrders(query?: Record<string, unknown>) {
  return useQuery({
    queryKey: [SERVICE_ORDER_QUERY_KEY, query],
    queryFn: () =>
      sdk.client.fetch<{
        service_orders: any[]
        count: number
        offset: number
        limit: number
      }>("/vendor/service-orders", {
        method: "GET",
        query: query as Record<string, string>,
      }),
  })
}

export function useVendorServiceOrder(id: string) {
  return useQuery({
    queryKey: [SERVICE_ORDER_QUERY_KEY, id],
    queryFn: () =>
      sdk.client.fetch<{ service_order: any }>(`/vendor/service-orders/${id}`, {
        method: "GET",
      }),
    enabled: !!id,
  })
}

export function useStartServiceOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/vendor/service-orders/${id}/start`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SERVICE_ORDER_QUERY_KEY] })
    },
  })
}

export function useSubmitDeliverable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { id: string; body: Record<string, unknown> }) =>
      sdk.client.fetch(`/vendor/service-orders/${data.id}/submit-deliverable`, {
        method: "POST",
        body: data.body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SERVICE_ORDER_QUERY_KEY] })
    },
  })
}

export function useSubmitMilestone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      orderId: string
      milestoneId: string
      body: Record<string, unknown>
    }) =>
      sdk.client.fetch(
        `/vendor/service-orders/${data.orderId}/milestones/${data.milestoneId}/submit`,
        {
          method: "POST",
          body: data.body,
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SERVICE_ORDER_QUERY_KEY] })
    },
  })
}
