import { ChatBubble, MagnifyingGlass, Spinner } from "@medusajs/icons"
import { Avatar, Input, Text, clx } from "@medusajs/ui"
import type { RoomMessageEventContent } from "matrix-js-sdk/lib/@types/events"
import { MatrixEvent, NotificationCountType, Room } from "matrix-js-sdk"
import { useEffect, useMemo, useState } from "react"

import { useMatrix, useMatrixRooms } from "../../providers/matrix-provider"
import { DealContextPanel } from "./deal-context-panel"
import { messagePreview } from "./matrix-cards"
import { formatSmartTimestamp, initials } from "./matrix-utils"
import { MatrixChat } from "./matrix-chat"
import { SendQuotationModal } from "./send-quotation-modal"
import { ShareProductModal } from "./share-product-modal"

const lastMessage = (room: Room): MatrixEvent | null => {
  const events = room.getLiveTimeline().getEvents()
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].getType() === "m.room.message" && !events[i].isRedacted()) {
      return events[i]
    }
  }
  return null
}

type InboxFilter = "all" | "unread"

/**
 * Deal-room inbox: searchable conversation list + thread + deal context
 * panel. Replaces the TalkJS <Inbox>.
 */
export const MatrixInbox = ({ className }: { className?: string }) => {
  const { client, ready } = useMatrix()
  const rooms = useMatrixRooms()
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<InboxFilter>("all")
  const [shareProductOpen, setShareProductOpen] = useState(false)
  const [quotationOpen, setQuotationOpen] = useState(false)

  useEffect(() => {
    if (!selectedRoomId && rooms.length > 0) {
      setSelectedRoomId(rooms[0].roomId)
    }
  }, [rooms, selectedRoomId])

  const visibleRooms = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rooms.filter((room) => {
      if (q && !room.name.toLowerCase().includes(q)) return false
      if (
        filter === "unread" &&
        !room.getUnreadNotificationCount(NotificationCountType.Total)
      ) {
        return false
      }
      return true
    })
  }, [rooms, search, filter])

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.roomId === selectedRoomId) || null,
    [rooms, selectedRoomId]
  )

  const sendCardToSelected = async (content: object) => {
    if (!client || !selectedRoomId) return
    await client.sendMessage(
      selectedRoomId,
      content as unknown as RoomMessageEventContent
    )
  }

  if (!client || !ready) {
    return (
      <div className={clx("flex h-full items-center justify-center", className)}>
        <Spinner className="text-ui-fg-interactive animate-spin" />
      </div>
    )
  }

  if (rooms.length === 0) {
    return (
      <div
        className={clx(
          "flex h-full flex-col items-center justify-center gap-y-2",
          className
        )}
      >
        <ChatBubble className="text-ui-fg-muted" />
        <Text size="small" className="text-ui-fg-muted">
          No conversations yet
        </Text>
        <Text size="xsmall" className="text-ui-fg-muted">
          Buyers who message you about your products will appear here.
        </Text>
      </div>
    )
  }

  return (
    <div className={clx("flex h-full min-h-0 overflow-hidden", className)}>
      {/* Conversation list */}
      <div className="border-ui-border-base flex w-80 shrink-0 flex-col border-r">
        <div className="border-ui-border-base flex flex-col gap-y-2 border-b px-3 py-3">
          <div className="relative">
            <MagnifyingGlass className="text-ui-fg-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              size="small"
              className="pl-9"
              placeholder="Search conversations"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-x-1">
            {(["all", "unread"] as const).map((value) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={clx(
                  "txt-small rounded-full px-3 py-0.5 transition-colors",
                  filter === value
                    ? "bg-ui-bg-interactive text-ui-fg-on-color"
                    : "bg-ui-bg-component text-ui-fg-subtle hover:bg-ui-bg-base-hover"
                )}
              >
                {value === "all" ? "All" : "Unread"}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {visibleRooms.length === 0 && (
            <div className="flex h-24 items-center justify-center">
              <Text size="xsmall" className="text-ui-fg-muted">
                No conversations match
              </Text>
            </div>
          )}
          {visibleRooms.map((room) => {
            const last = lastMessage(room)
            const unread = room.getUnreadNotificationCount(
              NotificationCountType.Total
            )
            const selected = room.roomId === selectedRoomId
            const own = last?.getSender() === client.getUserId()
            const preview = last
              ? `${own ? "You: " : ""}${messagePreview(last.getContent())}`
              : "No messages yet"

            return (
              <button
                key={room.roomId}
                onClick={() => setSelectedRoomId(room.roomId)}
                className={clx(
                  "border-ui-border-base hover:bg-ui-bg-base-hover flex w-full items-center gap-x-3 border-b border-l-2 px-3 py-3 text-left transition-colors",
                  selected
                    ? "bg-ui-bg-base-pressed border-l-ui-border-interactive"
                    : "border-l-transparent"
                )}
              >
                <Avatar fallback={initials(room.name)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-x-2">
                    <Text
                      size="small"
                      weight={unread > 0 ? "plus" : "regular"}
                      className="truncate"
                    >
                      {room.name}
                    </Text>
                    {last && (
                      <Text
                        size="xsmall"
                        className="text-ui-fg-muted shrink-0"
                      >
                        {formatSmartTimestamp(last.getTs())}
                      </Text>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-x-2">
                    <Text
                      size="xsmall"
                      className={clx("truncate", {
                        "text-ui-fg-base font-medium": unread > 0,
                        "text-ui-fg-subtle": unread === 0,
                      })}
                    >
                      {preview}
                    </Text>
                    {unread > 0 && (
                      <span className="bg-ui-bg-interactive text-ui-fg-on-color flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-xs">
                        {unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Thread */}
      <div className="min-w-0 flex-1">
        {selectedRoomId ? (
          <MatrixChat roomId={selectedRoomId} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Text size="small" className="text-ui-fg-muted">
              Select a conversation
            </Text>
          </div>
        )}
      </div>

      {/* Deal context */}
      <DealContextPanel
        client={client}
        room={selectedRoom}
        onShareProduct={() => setShareProductOpen(true)}
        onSendQuotation={() => setQuotationOpen(true)}
      />

      <ShareProductModal
        open={shareProductOpen}
        onOpenChange={setShareProductOpen}
        onSend={sendCardToSelected}
      />
      <SendQuotationModal
        open={quotationOpen}
        onOpenChange={setQuotationOpen}
        onSend={sendCardToSelected}
      />
    </div>
  )
}
