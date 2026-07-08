import { Photo, ReceiptPercent, Tag } from "@medusajs/icons"
import { Avatar, Badge, Button, Text } from "@medusajs/ui"
import { MatrixClient, Room } from "matrix-js-sdk"
import { useMemo } from "react"
import { Link } from "react-router-dom"

import { useProduct } from "../../hooks/api/products"
import { useQuotes } from "../../hooks/api/quotes"
import { ROOM_CONTEXT_EVENT_TYPE, getQuotation } from "./matrix-cards"
import { initials } from "./matrix-utils"

/** Product id the room was opened about (from the io.tese.room.context state event). */
const useRoomProductId = (room: Room | null): string | null =>
  useMemo(() => {
    if (!room) return null
    const stateEvent = room.currentState.getStateEvents(
      ROOM_CONTEXT_EVENT_TYPE,
      ""
    )
    const productId = stateEvent?.getContent()?.product_id
    return typeof productId === "string" && productId.startsWith("prod_")
      ? productId
      : null
  }, [room])

/** Latest RFQ linked from a quotation sent in this room, if any. */
const useLinkedEnquiryId = (room: Room | null): string | null =>
  useMemo(() => {
    if (!room) return null
    const events = room.getLiveTimeline().getEvents()
    for (let i = events.length - 1; i >= 0; i--) {
      const quotation = getQuotation(events[i].getContent())
      if (quotation?.enquiry_id) return quotation.enquiry_id
    }
    return null
  }, [room, room?.getLiveTimeline().getEvents().length])

/**
 * Right-hand "deal context" panel: who you're talking to, which product the
 * conversation is about, linked RFQ status, and quick commerce actions.
 */
export const DealContextPanel = ({
  client,
  room,
  onShareProduct,
  onSendQuotation,
}: {
  client: MatrixClient
  room: Room | null
  onShareProduct: () => void
  onSendQuotation: () => void
}) => {
  const counterpart = useMemo(() => {
    if (!client || !room) return null
    return (
      room
        .getMembers()
        .find(
          (member) =>
            member.userId !== client.getUserId() &&
            ["join", "invite"].includes(member.membership || "")
        ) || null
    )
  }, [client, room])

  const productId = useRoomProductId(room)
  const { product } = useProduct(
    productId!,
    { fields: "+thumbnail" },
    { enabled: !!productId }
  )

  const linkedEnquiryId = useLinkedEnquiryId(room)
  const { quotes } = useQuotes(
    { page: 1, size: 50 },
    { enabled: !!linkedEnquiryId }
  )
  const linkedEnquiry = linkedEnquiryId
    ? quotes.find((q) => q.enquiryId === linkedEnquiryId)
    : undefined

  if (!room) {
    return null
  }

  return (
    <div className="border-ui-border-base hidden w-72 shrink-0 flex-col gap-y-4 overflow-y-auto border-l px-4 py-4 lg:flex">
      <div className="flex items-center gap-x-3">
        <Avatar size="large" fallback={initials(counterpart?.name || room.name)} />
        <div className="min-w-0">
          <Text size="small" weight="plus" className="truncate">
            {counterpart?.name || "Unknown"}
          </Text>
          <Text size="xsmall" className="text-ui-fg-muted">
            Buyer
          </Text>
        </div>
      </div>

      {product && (
        <div className="border-ui-border-base overflow-hidden rounded-lg border">
          {product.thumbnail ? (
            <img
              src={product.thumbnail}
              alt={product.title}
              className="h-28 w-full object-cover"
            />
          ) : (
            <div className="bg-ui-bg-component flex h-28 w-full items-center justify-center">
              <Photo className="text-ui-fg-muted" />
            </div>
          )}
          <div className="flex flex-col gap-y-1 px-3 py-2">
            <Text size="xsmall" className="text-ui-fg-muted">
              Discussing
            </Text>
            <Text size="small" weight="plus" className="truncate">
              {product.title}
            </Text>
            <Link
              to={`/products/${product.id}`}
              className="text-ui-fg-interactive txt-small hover:underline"
            >
              Open product
            </Link>
          </div>
        </div>
      )}

      {linkedEnquiryId && (
        <div className="border-ui-border-base flex flex-col gap-y-1.5 rounded-lg border px-3 py-2">
          <Text size="xsmall" className="text-ui-fg-muted">
            Linked RFQ
          </Text>
          <div className="flex items-center justify-between gap-x-2">
            <Text size="small" className="truncate">
              {linkedEnquiry?.title || linkedEnquiryId}
            </Text>
            {linkedEnquiry?.status && (
              <Badge size="2xsmall" color="blue">
                {linkedEnquiry.status}
              </Badge>
            )}
          </div>
          <Link
            to="/quotes"
            className="text-ui-fg-interactive txt-small hover:underline"
          >
            View quote requests
          </Link>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-y-2">
        <Button
          variant="secondary"
          size="small"
          className="justify-start gap-x-2"
          onClick={onShareProduct}
        >
          <Tag /> Share product
        </Button>
        <Button
          variant="secondary"
          size="small"
          className="justify-start gap-x-2"
          onClick={onSendQuotation}
        >
          <ReceiptPercent /> Send quotation
        </Button>
      </div>
    </div>
  )
}
