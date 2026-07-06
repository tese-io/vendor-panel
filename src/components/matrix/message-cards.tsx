import { Photo, ReceiptPercent } from "@medusajs/icons"
import { Badge, Text, clx } from "@medusajs/ui"
import { Link } from "react-router-dom"

import { getLocaleAmount } from "../../lib/money-amount-helpers"
import {
  ProductCardPayload,
  QuotationPayload,
  formatCardAmount,
} from "./matrix-cards"

export type QuoteStatus = "pending" | "accepted" | "declined"

const cardShell =
  "w-64 overflow-hidden rounded-lg border bg-ui-bg-base shadow-elevation-card-rest"

/** Compact product card shown inside the chat timeline (vendor view). */
export const ProductCardMessage = ({
  card,
}: {
  card: ProductCardPayload
}) => {
  const { product } = card

  return (
    <div className={cardShell}>
      {product.thumbnail ? (
        <img
          src={product.thumbnail}
          alt={product.title}
          className="h-32 w-full object-cover"
        />
      ) : (
        <div className="bg-ui-bg-component flex h-32 w-full items-center justify-center">
          <Photo className="text-ui-fg-muted" />
        </div>
      )}
      <div className="flex flex-col gap-y-1 px-3 py-2">
        <Text size="small" weight="plus" className="truncate">
          {product.title}
        </Text>
        {product.price && (
          <Text size="small" className="text-ui-fg-subtle">
            {product.price.formatted ||
              getLocaleAmount(
                product.price.amount,
                product.price.currency_code
              )}
          </Text>
        )}
        <Link
          to={`/products/${product.id}`}
          className="text-ui-fg-interactive txt-small mt-1 hover:underline"
        >
          View product
        </Link>
      </div>
    </div>
  )
}

const statusChip: Record<QuoteStatus, { label: string; color: "orange" | "green" | "red" }> = {
  pending: { label: "⏳ Awaiting response", color: "orange" },
  accepted: { label: "✅ Accepted", color: "green" },
  declined: { label: "❌ Declined", color: "red" },
}

/** Quotation card shown inside the chat timeline. */
export const QuotationCardMessage = ({
  quotation,
  status = "pending",
}: {
  quotation: QuotationPayload
  status?: QuoteStatus
}) => {
  const validUntil = quotation.valid_until
    ? new Date(quotation.valid_until)
    : null
  const expired =
    !!validUntil &&
    !isNaN(validUntil.getTime()) &&
    validUntil.getTime() < Date.now() - 24 * 60 * 60 * 1000

  const chip = statusChip[status]

  return (
    <div className={clx(cardShell, "w-72")}>
      <div className="border-ui-border-base flex items-center gap-x-2 border-b px-3 py-2">
        <ReceiptPercent className="text-ui-fg-subtle" />
        <Text size="small" weight="plus">
          Quotation
        </Text>
        <Badge size="2xsmall" color={chip.color} className="ml-auto">
          {chip.label}
        </Badge>
      </div>

      <div className="flex flex-col gap-y-2 px-3 py-2">
        <Text size="large" weight="plus">
          {formatCardAmount(quotation.amount, quotation.currency_code)}
        </Text>

        {!!quotation.items?.length && (
          <div className="border-ui-border-base flex flex-col gap-y-1 rounded-md border px-2 py-1.5">
            {quotation.items.map((item, i) => (
              <div key={i} className="flex items-baseline justify-between gap-x-2">
                <Text size="xsmall" className="truncate">
                  {item.title}
                </Text>
                <Text size="xsmall" className="text-ui-fg-subtle shrink-0">
                  {item.quantity} × {getLocaleAmount(item.unit_amount, quotation.currency_code)}
                </Text>
              </div>
            ))}
          </div>
        )}

        {(quotation.moq || quotation.lead_time || quotation.payment_terms) && (
          <div className="flex flex-col gap-y-0.5">
            {quotation.moq && (
              <Text size="xsmall" className="text-ui-fg-subtle">
                MOQ: {quotation.moq}
              </Text>
            )}
            {quotation.lead_time && (
              <Text size="xsmall" className="text-ui-fg-subtle">
                Lead time: {quotation.lead_time}
              </Text>
            )}
            {quotation.payment_terms && (
              <Text size="xsmall" className="text-ui-fg-subtle">
                Payment: {quotation.payment_terms}
              </Text>
            )}
          </div>
        )}

        {validUntil && !isNaN(validUntil.getTime()) && (
          <Badge size="2xsmall" color={expired ? "red" : "grey"} className="w-fit">
            {expired ? "Expired " : "Valid until "}
            {validUntil.toLocaleDateString([], {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Badge>
        )}

        {quotation.notes && (
          <Text size="xsmall" className="text-ui-fg-muted whitespace-pre-wrap">
            {quotation.notes}
          </Text>
        )}

        {quotation.enquiry_id && (
          <Link
            to="/quotes"
            className="text-ui-fg-interactive txt-small hover:underline"
          >
            View RFQ
          </Link>
        )}
      </div>
    </div>
  )
}
