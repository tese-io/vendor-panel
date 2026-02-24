import { useNavigate, useSearchParams } from "react-router-dom"
import { Container, Heading, Text, Badge, Button } from "@medusajs/ui"
import { CheckCircleSolid } from "@medusajs/icons"
import { useVendorServiceOrders, useStartServiceOrder } from "../../hooks/api/service-orders"

const ORDER_STATUS_MAP: Record<string, { label: string; color: "green" | "orange" | "blue" | "red" | "grey" | "purple" }> = {
  pending_start: { label: "Pending Start", color: "orange" },
  in_progress: { label: "In Progress", color: "blue" },
  awaiting_review: { label: "Awaiting Review", color: "purple" },
  revision_requested: { label: "Revision Needed", color: "orange" },
  completed: { label: "Completed", color: "green" },
  cancelled: { label: "Cancelled", color: "red" },
  disputed: { label: "Disputed", color: "red" },
}

export const ServiceOrdersList = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const page = parseInt(searchParams.get("page") || "1", 10)
  const limit = 20
  const offset = (page - 1) * limit

  const { data, isPending } = useVendorServiceOrders({ limit, offset })
  const startOrder = useStartServiceOrder()

  const orders = data?.service_orders || []

  return (
    <div className="flex flex-col gap-y-3">
      <Container>
        <div className="flex items-center justify-between mb-6">
          <div>
            <Heading level="h2">Service Orders</Heading>
            <Text size="small" className="text-ui-fg-muted">
              Manage active service deliveries and milestones
            </Text>
          </div>
        </div>

        {isPending ? (
          <div className="py-8 text-center">
            <Text className="text-ui-fg-muted">Loading...</Text>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircleSolid className="w-12 h-12 text-ui-fg-muted mx-auto mb-3" />
            <Heading level="h3" className="mb-1">No service orders</Heading>
            <Text size="small" className="text-ui-fg-muted">
              When buyers purchase your services, orders will appear here.
            </Text>
          </div>
        ) : (
          <div className="divide-y divide-ui-border-base">
            {orders.map((order: any) => {
              const statusCfg = ORDER_STATUS_MAP[order.status] || ORDER_STATUS_MAP.pending_start
              const completedMilestones = order.milestones?.filter((m: any) => m.status === "completed").length || 0
              const totalMilestones = order.milestones?.length || 0

              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-4 hover:bg-ui-bg-subtle px-3 -mx-3 rounded transition-colors cursor-pointer"
                  onClick={() => navigate(`/service-orders/${order.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Text weight="plus">Order #{order.id.slice(-8)}</Text>
                      <Badge color={statusCfg.color} size="small">{statusCfg.label}</Badge>
                    </div>
                    <Text size="small" className="text-ui-fg-muted">
                      {order.service_title || "Service Order"}
                    </Text>
                    <div className="flex items-center gap-4 mt-1">
                      {totalMilestones > 0 && (
                        <Text size="xsmall" className="text-ui-fg-muted">
                          Milestones: {completedMilestones}/{totalMilestones}
                        </Text>
                      )}
                      <Text size="xsmall" className="text-ui-fg-muted">
                        {new Date(order.created_at).toLocaleDateString()}
                      </Text>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {order.status === "pending_start" && (
                      <Button
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          startOrder.mutate(order.id)
                        }}
                      >
                        Start
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Container>
    </div>
  )
}
