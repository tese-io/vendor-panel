import { useNavigate, useSearchParams } from "react-router-dom"
import { Container, Heading, Text, Badge, Button } from "@medusajs/ui"
import { Plus, PencilSquare } from "@medusajs/icons"
import { useVendorServices, usePublishService } from "../../hooks/api/services"

const STATUS_MAP: Record<string, { label: string; color: "green" | "orange" | "blue" | "red" | "grey" }> = {
  draft: { label: "Draft", color: "grey" },
  pending_approval: { label: "Pending", color: "orange" },
  active: { label: "Active", color: "green" },
  suspended: { label: "Suspended", color: "red" },
  archived: { label: "Archived", color: "grey" },
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  esg_audit: "ESG Audit",
  carbon_consulting: "Carbon Consulting",
  sustainability_strategy: "Sustainability Strategy",
  impact_reporting: "Impact Reporting",
  training: "Training",
  certification_support: "Certification",
  supply_chain_audit: "Supply Chain",
}

export const ServicesList = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const page = parseInt(searchParams.get("page") || "1", 10)
  const limit = 20
  const offset = (page - 1) * limit

  const { data, isPending } = useVendorServices({ limit, offset })
  const publishService = usePublishService()

  const services = data?.services || []
  const count = data?.count || 0

  return (
    <div className="flex flex-col gap-y-3">
      <Container>
        <div className="flex items-center justify-between mb-6">
          <div>
            <Heading level="h2">Services</Heading>
            <Text size="small" className="text-ui-fg-muted">
              Manage your ESG and sustainability service offerings
            </Text>
          </div>
          <Button onClick={() => navigate("/services/create")}>
            <Plus className="mr-2" />
            Create Service
          </Button>
        </div>

        {isPending ? (
          <div className="py-8 text-center">
            <Text className="text-ui-fg-muted">Loading services...</Text>
          </div>
        ) : services.length === 0 ? (
          <div className="py-12 text-center">
            <Heading level="h3" className="mb-2">No services yet</Heading>
            <Text size="small" className="text-ui-fg-muted mb-4">
              Create your first service listing to start receiving requests.
            </Text>
            <Button onClick={() => navigate("/services/create")}>
              <Plus className="mr-2" />
              Create Your First Service
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-ui-border-base">
            {services.map((service: any) => {
              const statusCfg = STATUS_MAP[service.status] || STATUS_MAP.draft
              return (
                <div
                  key={service.id}
                  className="flex items-center justify-between py-4 hover:bg-ui-bg-subtle px-3 -mx-3 rounded transition-colors cursor-pointer"
                  onClick={() => navigate(`/services/${service.id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Text weight="plus" className="truncate">{service.title}</Text>
                      <Badge color={statusCfg.color} size="small">{statusCfg.label}</Badge>
                      <Badge size="small">
                        {SERVICE_TYPE_LABELS[service.service_type] || service.service_type}
                      </Badge>
                    </div>
                    <Text size="small" className="text-ui-fg-muted line-clamp-1">{service.description}</Text>
                    <div className="flex items-center gap-3 mt-1">
                      <Text size="xsmall" className="text-ui-fg-muted">
                        {service.tiers?.length || 0} tier(s)
                      </Text>
                      <Text size="xsmall" className="text-ui-fg-muted">
                        Updated: {new Date(service.updated_at).toLocaleDateString()}
                      </Text>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {service.status === "draft" && (
                      <Button
                        variant="secondary"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          publishService.mutate(service.id)
                        }}
                      >
                        Publish
                      </Button>
                    )}
                    <Button
                      variant="transparent"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/services/${service.id}`)
                      }}
                    >
                      <PencilSquare />
                    </Button>
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
