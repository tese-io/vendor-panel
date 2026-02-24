import { useSearchParams, useNavigate } from "react-router-dom"
import { Container, Heading, Text, Badge, Button } from "@medusajs/ui"
import { DocumentText, ArrowPath, Clock, ChatBubble } from "@medusajs/icons"
import { useVendorRfqs, useVendorQuotationStats } from "../../hooks/api/rfq"

const STATUS_MAP: Record<
  string,
  {
    label: string
    color: "green" | "orange" | "blue" | "red" | "grey" | "purple"
  }
> = {
  submitted: { label: "New", color: "blue" },
  quoting: { label: "Quoting", color: "orange" },
  quoted: { label: "Quoted", color: "green" },
  in_negotiation: { label: "Negotiating", color: "purple" },
  accepted: { label: "Accepted", color: "green" },
  rejected: { label: "Rejected", color: "red" },
  expired: { label: "Expired", color: "grey" },
}

export const QuotesList = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const status = searchParams.get("status") || undefined
  const page = parseInt(searchParams.get("page") || "1", 10)
  const limit = 20
  const offset = (page - 1) * limit

  const { rfq_requests: rfqs = [], count = 0, isPending: isPendingRfqs } = useVendorRfqs(
    {
      status,
      limit,
      offset,
    }
  )

  const { stats } = useVendorQuotationStats()

  return (
    <div className="flex flex-col gap-y-3">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Container className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-ui-bg-subtle flex items-center justify-center">
                <DocumentText className="text-ui-fg-muted" />
              </div>
              <div>
                <Text size="small" className="text-ui-fg-muted">
                  Total Quotes
                </Text>
                <Heading level="h3">{stats.total || 0}</Heading>
              </div>
            </div>
          </Container>
          <Container className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-ui-bg-subtle flex items-center justify-center">
                <ArrowPath className="text-ui-fg-muted" />
              </div>
              <div>
                <Text size="small" className="text-ui-fg-muted">
                  Conversion Rate
                </Text>
                <Heading level="h3">{stats.conversion_rate || 0}%</Heading>
              </div>
            </div>
          </Container>
          <Container className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-ui-bg-subtle flex items-center justify-center">
                <Clock className="text-ui-fg-muted" />
              </div>
              <div>
                <Text size="small" className="text-ui-fg-muted">
                  Pending
                </Text>
                <Heading level="h3">{stats.pending || 0}</Heading>
              </div>
            </div>
          </Container>
          <Container className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-ui-bg-subtle flex items-center justify-center">
                <ChatBubble className="text-ui-fg-muted" />
              </div>
              <div>
                <Text size="small" className="text-ui-fg-muted">
                  In Negotiation
                </Text>
                <Heading level="h3">{stats.in_negotiation || 0}</Heading>
              </div>
            </div>
          </Container>
        </div>
      )}

      {/* RFQ Inbox */}
      <Container>
        <div className="flex items-center justify-between mb-4">
          <div>
            <Heading level="h2">RFQ Inbox</Heading>
            <Text size="small" className="text-ui-fg-muted">
              Incoming quote requests from buyers
            </Text>
          </div>
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto">
          {[
            { value: "", label: "All" },
            { value: "submitted", label: "New" },
            { value: "quoting", label: "In Progress" },
            { value: "in_negotiation", label: "Negotiating" },
          ].map((tab) => (
            <Button
              key={tab.value}
              variant={
                status === tab.value || (!status && !tab.value)
                  ? "primary"
                  : "secondary"
              }
              size="small"
              onClick={() => {
                const params = new URLSearchParams(searchParams)
                if (tab.value) {
                  params.set("status", tab.value)
                } else {
                  params.delete("status")
                }
                params.delete("page")
                setSearchParams(params)
              }}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {isPendingRfqs ? (
          <div className="py-8 text-center">
            <Text className="text-ui-fg-muted">Loading...</Text>
          </div>
        ) : rfqs.length === 0 ? (
          <div className="py-12 text-center">
            <DocumentText className="w-12 h-12 text-ui-fg-muted mx-auto mb-3" />
            <Heading level="h3" className="mb-1">
              No RFQ requests
            </Heading>
            <Text size="small" className="text-ui-fg-muted">
              When buyers send quote requests, they will appear here.
            </Text>
          </div>
        ) : (
          <div className="divide-y divide-ui-border-base">
            {rfqs.map((rfq: any) => {
              const statusCfg = STATUS_MAP[rfq.status] || STATUS_MAP.submitted
              return (
                <button
                  key={rfq.id}
                  onClick={() => navigate(`/quotes/${rfq.id}`)}
                  className="w-full text-left flex items-center justify-between py-3 hover:bg-ui-bg-subtle px-3 -mx-3 rounded transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Text weight="plus" className="truncate">
                        {rfq.title}
                      </Text>
                      <Badge color={statusCfg.color} size="small">
                        {statusCfg.label}
                      </Badge>
                    </div>
                    <Text size="small" className="text-ui-fg-muted line-clamp-1">
                      {rfq.description}
                    </Text>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {rfq.budget_max && (
                        <Text size="xsmall" className="text-ui-fg-muted">
                          Budget: ${(rfq.budget_max / 100).toLocaleString()}
                        </Text>
                      )}
                      {rfq.deadline && (
                        <Text size="xsmall" className="text-ui-fg-muted">
                          Deadline:{" "}
                          {new Date(rfq.deadline).toLocaleDateString()}
                        </Text>
                      )}
                      <Text size="xsmall" className="text-ui-fg-muted">
                        {new Date(rfq.created_at).toLocaleDateString()}
                      </Text>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {count > limit && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-ui-border-base">
            <Text size="small" className="text-ui-fg-muted">
              Showing {offset + 1} to {Math.min(offset + limit, count)} of{" "}
              {count} RFQs
            </Text>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="small"
                disabled={page === 1}
                onClick={() => {
                  const params = new URLSearchParams(searchParams)
                  params.set("page", String(page - 1))
                  setSearchParams(params)
                }}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="small"
                disabled={offset + limit >= count}
                onClick={() => {
                  const params = new URLSearchParams(searchParams)
                  params.set("page", String(page + 1))
                  setSearchParams(params)
                }}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Container>
    </div>
  )
}
