import { useSearchParams } from "react-router-dom"
import { Container, Heading, Text, Badge } from "@medusajs/ui"
import { CurrencyDollar, ShieldCheck, ExclamationCircle } from "@medusajs/icons"
import { useVendorEscrow, useVendorEscrowStats } from "../../hooks/api/escrow"

const ESCROW_STATUS_MAP: Record<string, { label: string; color: "green" | "orange" | "blue" | "red" | "grey" | "purple" }> = {
  pending: { label: "Pending", color: "orange" },
  held: { label: "Held", color: "blue" },
  partially_released: { label: "Partial Release", color: "purple" },
  released: { label: "Released", color: "green" },
  refunded: { label: "Refunded", color: "red" },
  disputed: { label: "Disputed", color: "red" },
}

export const EscrowDashboard = () => {
  const [searchParams] = useSearchParams()
  const page = parseInt(searchParams.get("page") || "1", 10)
  const limit = 20
  const offset = (page - 1) * limit

  const { data: escrowData, isPending } = useVendorEscrow({ limit, offset })
  const { data: statsData } = useVendorEscrowStats()

  const transactions = escrowData?.escrow_transactions || []
  const stats = statsData?.stats

  return (
    <div className="flex flex-col gap-y-3">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Container className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-ui-bg-subtle flex items-center justify-center">
                <CurrencyDollar className="text-ui-fg-muted" />
              </div>
              <div>
                <Text size="small" className="text-ui-fg-muted">Total Held</Text>
                <Heading level="h3">${((stats.total_held || 0) / 100).toLocaleString()}</Heading>
              </div>
            </div>
          </Container>
          <Container className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-ui-bg-subtle flex items-center justify-center">
                <ShieldCheck className="text-ui-fg-muted" />
              </div>
              <div>
                <Text size="small" className="text-ui-fg-muted">Total Released</Text>
                <Heading level="h3">${((stats.total_released || 0) / 100).toLocaleString()}</Heading>
              </div>
            </div>
          </Container>
          <Container className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-ui-bg-subtle flex items-center justify-center">
                <CurrencyDollar className="text-ui-fg-muted" />
              </div>
              <div>
                <Text size="small" className="text-ui-fg-muted">Pending Release</Text>
                <Heading level="h3">{stats.pending_count || 0}</Heading>
              </div>
            </div>
          </Container>
          <Container className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-ui-bg-subtle flex items-center justify-center">
                <ExclamationCircle className="text-ui-fg-muted" />
              </div>
              <div>
                <Text size="small" className="text-ui-fg-muted">Disputed</Text>
                <Heading level="h3">{stats.disputed_count || 0}</Heading>
              </div>
            </div>
          </Container>
        </div>
      )}

      {/* Transactions List */}
      <Container>
        <div className="flex items-center justify-between mb-4">
          <div>
            <Heading level="h2">Escrow Transactions</Heading>
            <Text size="small" className="text-ui-fg-muted">
              Track payment holds, releases, and disputes
            </Text>
          </div>
        </div>

        {isPending ? (
          <div className="py-8 text-center">
            <Text className="text-ui-fg-muted">Loading...</Text>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center">
            <ShieldCheck className="w-12 h-12 text-ui-fg-muted mx-auto mb-3" />
            <Heading level="h3" className="mb-1">No escrow transactions</Heading>
            <Text size="small" className="text-ui-fg-muted">
              When buyers make purchases, escrow transactions will appear here.
            </Text>
          </div>
        ) : (
          <div className="divide-y divide-ui-border-base">
            {transactions.map((tx: any) => {
              const statusCfg = ESCROW_STATUS_MAP[tx.status] || ESCROW_STATUS_MAP.pending
              return (
                <div key={tx.id} className="flex items-center justify-between py-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Text weight="plus">Order #{tx.order_id?.slice(-8) || "N/A"}</Text>
                      <Badge color={statusCfg.color} size="small">{statusCfg.label}</Badge>
                      <Badge size="small">{tx.escrow_type}</Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <Text size="xsmall" className="text-ui-fg-muted">
                        Total: ${(tx.total_amount / 100).toLocaleString()}
                      </Text>
                      <Text size="xsmall" className="text-ui-fg-muted">
                        Held: ${(tx.held_amount / 100).toLocaleString()}
                      </Text>
                      <Text size="xsmall" className="text-ui-fg-muted">
                        Released: ${((tx.released_amount || 0) / 100).toLocaleString()}
                      </Text>
                      <Text size="xsmall" className="text-ui-fg-muted">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </Text>
                    </div>
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
