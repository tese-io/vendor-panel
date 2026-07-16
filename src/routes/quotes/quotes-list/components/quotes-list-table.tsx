import { createColumnHelper } from "@tanstack/react-table"
import { useMemo, useState } from "react"
import {
  Badge,
  Button,
  Container,
  FocusModal,
  Heading,
  Input,
  Label,
  Select,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { keepPreviousData } from "@tanstack/react-query"

import { _DataTable } from "../../../../components/table/data-table"
import { DateCell } from "../../../../components/table/table-cells/common/date-cell"
import {
  Quote,
  useQuotes,
  useSubmitQuote,
} from "../../../../hooks/api/quotes"
import { useDataTable } from "../../../../hooks/use-data-table"

const PAGE_SIZE = 20
const CURRENCIES = ["EUR", "USD", "GBP", "INR", "CNY", "AED", "SGD"]

const columnHelper = createColumnHelper<Quote>()

function sellerTarget (quote: Quote) {
  return quote.targets?.[0]
}

function formatMoney (amount?: number | null, currency?: string) {
  if (amount == null || Number.isNaN(amount)) return "—"
  const code = (currency || "EUR").toUpperCase()
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
    }).format(amount)
  } catch {
    return `${amount} ${code}`
  }
}

function statusColor (status?: string): "green" | "orange" | "blue" | "grey" | "red" {
  switch ((status || "").toLowerCase()) {
    case "accepted":
      return "green"
    case "quoted":
      return "blue"
    case "open":
    case "sent":
    case "draft":
      return "orange"
    case "rejected":
    case "expired":
      return "red"
    default:
      return "grey"
  }
}

export const QuotesListTable = () => {
  const [quoting, setQuoting] = useState<Quote | null>(null)

  const { quotes, pagination, isLoading, isError, error } = useQuotes(
    { page: 1, size: 50 },
    { placeholderData: keepPreviousData }
  )

  const count = pagination?.total ?? quotes.length
  const columns = useColumns((quote) => setQuoting(quote))

  const { table } = useDataTable({
    data: quotes,
    columns,
    count,
    enablePagination: true,
    getRowId: (row) => row.enquiryId,
    pageSize: PAGE_SIZE,
  })

  if (isError) {
    throw error
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>Quote requests</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            RFQs from marketplace buyers for your products
          </Text>
        </div>
        <Text className="text-ui-fg-subtle" size="small">
          {count} {count === 1 ? "request" : "requests"}
        </Text>
      </div>
      <_DataTable
        table={table}
        columns={columns}
        pageSize={PAGE_SIZE}
        count={count}
        isLoading={isLoading}
        pagination
        search={false}
        noRecords={{
          message: "Quote requests from buyers will show up here.",
        }}
      />
      {quoting ? (
        <SubmitQuoteModal
          quote={quoting}
          open={Boolean(quoting)}
          onOpenChange={(open) => {
            if (!open) setQuoting(null)
          }}
          onSubmitted={() => setQuoting(null)}
        />
      ) : null}
    </Container>
  )
}

function SubmitQuoteModal ({
  quote,
  open,
  onOpenChange,
  onSubmitted,
}: {
  quote: Quote
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmitted: () => void
}) {
  const target = sellerTarget(quote)
  const [amount, setAmount] = useState(
    String(target?.quotedAmount ?? "")
  )
  const [currency, setCurrency] = useState(
    target?.quotedCurrency || "EUR"
  )
  const [notes, setNotes] = useState("")
  const { mutateAsync, isPending } = useSubmitQuote()

  const submit = async () => {
    const quotedAmount = Number(amount)
    if (!Number.isFinite(quotedAmount) || quotedAmount <= 0) {
      toast.error("Enter a valid quote amount")
      return
    }

    try {
      await mutateAsync({
        enquiryId: quote.enquiryId,
        quotedAmount,
        quotedCurrency: currency,
        quoteNotes: notes.trim() || undefined,
      })
      toast.success("Quote submitted")
      onSubmitted()
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit quote")
    }
  }

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <FocusModal.Header>
          <FocusModal.Title>Submit quote</FocusModal.Title>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col gap-4 px-6 py-4">
          <div>
            <Text weight="plus">{quote.title || "RFQ"}</Text>
            <Text size="small" className="text-ui-fg-subtle">
              {quote.buyerName ? `Buyer: ${quote.buyerName}` : quote.enquiryId}
            </Text>
            {quote.requirement ? (
              <Text size="small" className="text-ui-fg-subtle mt-2">
                {quote.requirement}
              </Text>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="quote-amount">Amount</Label>
              <Input
                id="quote-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="quote-currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <Select.Trigger id="quote-currency">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {CURRENCIES.map((code) => (
                    <Select.Item key={code} value={code}>
                      {code}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-y-2">
            <Label htmlFor="quote-notes">Notes (optional)</Label>
            <Textarea
              id="quote-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </FocusModal.Body>
        <FocusModal.Footer>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={submit} isLoading={isPending}>
            Submit quote
          </Button>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  )
}

const useColumns = (onQuote: (quote: Quote) => void) => {
  return useMemo(
    () => [
      columnHelper.accessor("title", {
        header: "Title",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="txt-compact-medium-plus">
              {row.original.title || "Untitled request"}
            </span>
            {row.original.requirement ? (
              <span className="text-ui-fg-subtle txt-compact-small line-clamp-1">
                {row.original.requirement}
              </span>
            ) : null}
          </div>
        ),
      }),
      columnHelper.accessor("buyerName", {
        header: "Buyer",
        cell: ({ getValue }) => getValue() || "—",
      }),
      columnHelper.display({
        id: "product",
        header: "Product",
        cell: ({ row }) => {
          const target = sellerTarget(row.original)
          return target?.productTitle || target?.productHandle || "—"
        },
      }),
      columnHelper.display({
        id: "amount",
        header: "Your quote",
        cell: ({ row }) => {
          const target = sellerTarget(row.original)
          return formatMoney(target?.quotedAmount, target?.quotedCurrency)
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: ({ row }) => {
          const target = sellerTarget(row.original)
          const status = target?.status || row.original.status || "open"
          return (
            <Badge size="2xsmall" color={statusColor(status)}>
              {status}
            </Badge>
          )
        },
      }),
      columnHelper.accessor("createdAt", {
        header: "Date",
        cell: ({ getValue }) => {
          const value = getValue()
          return value ? <DateCell date={value} /> : "—"
        },
      }),
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => {
          const target = sellerTarget(row.original)
          const status = (target?.status || row.original.status || "open").toLowerCase()
          if (status === "accepted") return null
          return (
            <Button
              size="small"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation()
                onQuote(row.original)
              }}
            >
              {status === "quoted" ? "Revise" : "Quote"}
            </Button>
          )
        },
      }),
    ],
    [onQuote]
  )
}
