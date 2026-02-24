import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { sdk } from "../../lib/config"

const SERVICE_QUERY_KEY = "vendor-services"

export function useVendorServices(query?: Record<string, unknown>) {
  return useQuery({
    queryKey: [SERVICE_QUERY_KEY, query],
    queryFn: () =>
      sdk.client.fetch<{
        services: any[]
        count: number
        offset: number
        limit: number
      }>("/vendor/services", {
        method: "GET",
        query: query as Record<string, string>,
      }),
  })
}

export function useVendorService(id: string) {
  return useQuery({
    queryKey: [SERVICE_QUERY_KEY, id],
    queryFn: () =>
      sdk.client.fetch<{ service: any }>(`/vendor/services/${id}`, {
        method: "GET",
      }),
    enabled: !!id,
  })
}

export function useCreateService() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      sdk.client.fetch("/vendor/services", {
        method: "POST",
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SERVICE_QUERY_KEY] })
    },
  })
}

export function useUpdateService() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { id: string; body: Record<string, unknown> }) =>
      sdk.client.fetch(`/vendor/services/${data.id}`, {
        method: "PUT",
        body: data.body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SERVICE_QUERY_KEY] })
    },
  })
}

export function usePublishService() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/vendor/services/${id}/publish`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SERVICE_QUERY_KEY] })
    },
  })
}

export function useDeleteService() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/vendor/services/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SERVICE_QUERY_KEY] })
    },
  })
}
