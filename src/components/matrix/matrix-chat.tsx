import {
  ArrowUpCircleSolid,
  Bolt,
  DocumentText,
  PaperClip,
  Plus,
  ReceiptPercent,
  Spinner,
  Tag,
} from "@medusajs/icons"
import { Avatar, DropdownMenu, IconButton, Text, clx } from "@medusajs/ui"
import {
  MatrixClient,
  MatrixEvent,
  MsgType,
  Room,
  RoomEvent,
  RoomMember,
  RoomMemberEvent,
} from "matrix-js-sdk"
import type { RoomMessageEventContent } from "matrix-js-sdk/lib/@types/events"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useMatrix } from "../../providers/matrix-provider"
import {
  getProductCard,
  getQuotation,
  getQuoteResponse,
  isCardContent,
} from "./matrix-cards"
import {
  buildTimeline,
  formatDateSeparator,
  formatTimeOfDay,
  initials,
} from "./matrix-utils"
import {
  ProductCardMessage,
  QuotationCardMessage,
  QuoteStatus,
} from "./message-cards"
import { SendQuotationModal } from "./send-quotation-modal"
import { ShareProductModal } from "./share-product-modal"

const QUICK_REPLIES = [
  "Thanks for reaching out — how many units do you need?",
  "Let me prepare a quotation for you.",
  "This product is in stock and ready to ship.",
  "Could you share your delivery location and timeline?",
]

const isDisplayableMessage = (event: MatrixEvent) =>
  event.getType() === "m.room.message" && !event.isRedacted()

const timelineMessages = (room: Room) =>
  room.getLiveTimeline().getEvents().filter(isDisplayableMessage)

/**
 * Renders mxc:// media through the authenticated media endpoint (plain
 * <img src> can't send the Authorization header Synapse requires).
 */
const useMxcObjectUrl = (client: MatrixClient | null, mxcUrl?: string) => {
  const [url, setUrl] = useState<string>()

  useEffect(() => {
    if (!client || !mxcUrl) {
      return
    }

    const httpUrl = client.mxcUrlToHttp(
      mxcUrl,
      undefined,
      undefined,
      undefined,
      false,
      true,
      true
    )
    if (!httpUrl) {
      return
    }

    let objectUrl: string | undefined
    let disposed = false

    fetch(httpUrl, {
      headers: { Authorization: `Bearer ${client.getAccessToken()}` },
    })
      .then((response) => (response.ok ? response.blob() : null))
      .then((blob) => {
        if (blob && !disposed) {
          objectUrl = URL.createObjectURL(blob)
          setUrl(objectUrl)
        }
      })
      .catch(() => {})

    return () => {
      disposed = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [client, mxcUrl])

  return url
}

const MessageContent = ({
  client,
  event,
  quoteStatuses,
}: {
  client: MatrixClient
  event: MatrixEvent
  quoteStatuses: Record<string, QuoteStatus>
}) => {
  const content = event.getContent()
  const mediaUrl = useMxcObjectUrl(
    client,
    content.msgtype === MsgType.Image || content.msgtype === MsgType.File
      ? content.url
      : undefined
  )

  const productCard = getProductCard(content)
  if (productCard) {
    return <ProductCardMessage card={productCard} />
  }

  const quotation = getQuotation(content)
  if (quotation) {
    return (
      <QuotationCardMessage
        quotation={quotation}
        status={quoteStatuses[quotation.quote_id] || "pending"}
      />
    )
  }

  if (content.msgtype === MsgType.Image) {
    return mediaUrl ? (
      <img
        src={mediaUrl}
        alt={content.body}
        className="max-h-64 max-w-full rounded-md"
      />
    ) : (
      <Text size="small" className="italic">
        {content.body}
      </Text>
    )
  }

  if (content.msgtype === MsgType.File) {
    return (
      <a
        href={mediaUrl}
        download={content.body}
        className="flex items-center gap-x-1.5 underline"
      >
        <DocumentText className="shrink-0" />
        <span className="break-all">{content.body}</span>
      </a>
    )
  }

  return (
    <Text size="small" className="whitespace-pre-wrap break-words">
      {content.body}
    </Text>
  )
}

const DateSeparator = ({ ts }: { ts: number }) => (
  <div className="flex items-center gap-x-3 py-1">
    <hr className="border-ui-border-base flex-1" />
    <Text size="xsmall" className="text-ui-fg-muted">
      {formatDateSeparator(ts)}
    </Text>
    <hr className="border-ui-border-base flex-1" />
  </div>
)

/** Counterpart member of the room (first joined member that isn't us). */
const useCounterpart = (client: MatrixClient | null, room: Room | null) => {
  return useMemo(() => {
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
}

/**
 * Single-room chat pane: deal-room timeline + commerce composer.
 * Drop-in replacement for the TalkJS <Chatbox>.
 */
export const MatrixChat = ({
  roomId,
  className,
  header = true,
}: {
  roomId: string
  className?: string
  header?: boolean
}) => {
  const { client, ready } = useMatrix()
  const [events, setEvents] = useState<MatrixEvent[]>([])
  const [room, setRoom] = useState<Room | null>(null)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [typingNames, setTypingNames] = useState<string[]>([])
  const [shareProductOpen, setShareProductOpen] = useState(false)
  const [quotationOpen, setQuotationOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastTypingSentRef = useRef(0)
  const lastReadSentRef = useRef<string | null>(null)

  const counterpart = useCounterpart(client, room)

  // The room can lag one sync behind its creation via the backend API.
  useEffect(() => {
    if (!client || !ready) {
      return
    }

    const resolve = () => {
      const found = client.getRoom(roomId)
      if (found) {
        setRoom(found)
      }
      return !!found
    }

    if (resolve()) {
      return
    }

    const interval = setInterval(() => {
      if (resolve()) {
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [client, ready, roomId])

  useEffect(() => {
    if (!client || !room) {
      return
    }

    const refresh = () => setEvents(timelineMessages(room))

    refresh()

    if (timelineMessages(room).length < 20) {
      client.scrollback(room, 30).then(refresh).catch(() => {})
    }

    const onTimeline = (_event: MatrixEvent, eventRoom?: Room) => {
      if (!eventRoom || eventRoom.roomId === room.roomId) {
        refresh()
      }
    }

    const onTyping = (_event: unknown, member: RoomMember) => {
      if (member.roomId !== room.roomId) return
      if (member.userId === client.getUserId()) return
      setTypingNames(
        room
          .getMembers()
          .filter((m) => m.typing && m.userId !== client.getUserId())
          .map((m) => m.name)
      )
    }

    client.on(RoomEvent.Timeline, onTimeline)
    client.on(RoomEvent.LocalEchoUpdated, refresh)
    client.on(RoomEvent.Receipt, refresh)
    client.on(RoomMemberEvent.Typing, onTyping)

    return () => {
      client.removeListener(RoomEvent.Timeline, onTimeline)
      client.removeListener(RoomEvent.LocalEchoUpdated, refresh)
      client.removeListener(RoomEvent.Receipt, refresh)
      client.removeListener(RoomMemberEvent.Typing, onTyping)
    }
  }, [client, room])

  // Mark the latest event as read while the chat is on screen. Guarded per
  // event id — the Receipt listener refreshes `events`, and re-sending here
  // on every refresh would loop receipt -> refresh -> receipt forever.
  useEffect(() => {
    const last = events[events.length - 1]
    if (
      client &&
      last &&
      last.getSender() !== client.getUserId() &&
      last.getId() !== lastReadSentRef.current
    ) {
      lastReadSentRef.current = last.getId() || null
      client.sendReadReceipt(last).catch(() => {})
    }
    // Scroll only the message list, not the whole page.
    const list = bottomRef.current?.parentElement
    if (list) {
      list.scrollTop = list.scrollHeight
    }
  }, [client, events])

  /** quote_id -> latest accept/decline response found in the timeline. */
  const quoteStatuses = useMemo(() => {
    const map: Record<string, QuoteStatus> = {}
    for (const event of events) {
      const response = getQuoteResponse(event.getContent())
      if (response) {
        map[response.quote_id] = response.status
      }
    }
    return map
  }, [events])

  /** Index of the last event the counterpart has read (-1 if none). */
  const counterpartReadIndex = useMemo(() => {
    if (!room || !counterpart) return -1
    const readEventId = room.getEventReadUpTo(counterpart.userId)
    if (!readEventId) return -1
    return events.findIndex((event) => event.getId() === readEventId)
  }, [room, counterpart, events])

  const timeline = useMemo(
    () =>
      buildTimeline(
        events,
        (event) => event.getSender() || undefined,
        (event) => event.getTs()
      ),
    [events]
  )

  const lastOwnEventIndex = useMemo(() => {
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i].getSender() === client?.getUserId()) return i
    }
    return -1
  }, [events, client])

  const sendCard = useCallback(
    async (content: object) => {
      if (!client) return
      await client.sendMessage(
        roomId,
        content as unknown as RoomMessageEventContent
      )
    },
    [client, roomId]
  )

  const notifyTyping = useCallback(() => {
    if (!client) return
    const now = Date.now()
    if (now - lastTypingSentRef.current > 3000) {
      lastTypingSentRef.current = now
      client.sendTyping(roomId, true, 4000).catch(() => {})
    }
  }, [client, roomId])

  const sendText = useCallback(async () => {
    const body = text.trim()
    if (!client || !body || sending) {
      return
    }
    setSending(true)
    try {
      client.sendTyping(roomId, false, 0).catch(() => {})
      await client.sendMessage(roomId, { msgtype: MsgType.Text, body })
      setText("")
    } catch (error) {
      console.error("Could not send message", error)
    } finally {
      setSending(false)
    }
  }, [client, roomId, text, sending])

  const sendFile = useCallback(
    async (file: File) => {
      if (!client) {
        return
      }
      setSending(true)
      try {
        const upload = await client.uploadContent(file, {
          name: file.name,
          type: file.type,
        })
        const content = {
          msgtype: file.type.startsWith("image/")
            ? MsgType.Image
            : MsgType.File,
          body: file.name,
          url: upload.content_uri,
          info: { mimetype: file.type, size: file.size },
        }
        await client.sendMessage(roomId, content as RoomMessageEventContent)
      } catch (error) {
        console.error("Could not send attachment", error)
      } finally {
        setSending(false)
      }
    },
    [client, roomId]
  )

  if (!client || !ready || !room) {
    return (
      <div
        className={clx("flex h-full items-center justify-center", className)}
      >
        <Spinner className="text-ui-fg-interactive animate-spin" />
      </div>
    )
  }

  return (
    <div className={clx("flex h-full min-h-0 flex-col", className)}>
      {header && (
        <div className="border-ui-border-base flex items-center gap-x-3 border-b px-4 py-3">
          <Avatar fallback={initials(counterpart?.name || room.name)} />
          <div className="min-w-0">
            <Text size="small" weight="plus" className="truncate">
              {counterpart?.name || room.name}
            </Text>
            <Text size="xsmall" className="text-ui-fg-muted truncate">
              {room.name}
            </Text>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-4 py-3">
        {events.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <Text size="small" className="text-ui-fg-muted">
              No messages yet — say hello!
            </Text>
          </div>
        )}
        {timeline.map(({ event, groupStart, groupEnd, newDay }, index) => {
          const content = event.getContent()
          const own = event.getSender() === client.getUserId()

          const quoteResponse = getQuoteResponse(content)
          if (quoteResponse) {
            return (
              <div key={event.getId()}>
                {newDay && <DateSeparator ts={event.getTs()} />}
                <div className="flex justify-center py-1">
                  <Text
                    size="xsmall"
                    className="text-ui-fg-muted bg-ui-bg-component rounded-full px-3 py-0.5"
                  >
                    {content.body}
                  </Text>
                </div>
              </div>
            )
          }

          const card = isCardContent(content)
          const seen =
            own &&
            index === lastOwnEventIndex &&
            counterpartReadIndex >= index

          return (
            <div key={event.getId()}>
              {newDay && <DateSeparator ts={event.getTs()} />}
              <div
                className={clx("flex gap-x-2", {
                  "justify-end": own,
                  "justify-start": !own,
                  "mt-2": groupStart,
                })}
              >
                {!own && (
                  <div className="w-6 shrink-0 self-end">
                    {groupEnd && (
                      <Avatar
                        size="xsmall"
                        fallback={initials(event.sender?.name)}
                      />
                    )}
                  </div>
                )}
                <div
                  className={clx("flex max-w-[72%] flex-col", {
                    "items-end": own,
                    "items-start": !own,
                  })}
                >
                  {!own && groupStart && (
                    <Text
                      size="xsmall"
                      className="text-ui-fg-muted mb-0.5 px-1"
                    >
                      {event.sender?.name || event.getSender()}
                    </Text>
                  )}
                  {card ? (
                    <MessageContent
                      client={client}
                      event={event}
                      quoteStatuses={quoteStatuses}
                    />
                  ) : (
                    <div
                      className={clx(
                        "rounded-lg px-3 py-2",
                        own
                          ? "bg-ui-bg-interactive text-ui-fg-on-color rounded-br-sm"
                          : "bg-ui-bg-component shadow-elevation-card-rest rounded-tl-sm"
                      )}
                    >
                      <MessageContent
                        client={client}
                        event={event}
                        quoteStatuses={quoteStatuses}
                      />
                    </div>
                  )}
                  {(groupEnd || seen) && (
                    <Text
                      size="xsmall"
                      className="text-ui-fg-muted mt-0.5 px-1"
                    >
                      {formatTimeOfDay(event.getTs())}
                      {seen && " · Seen"}
                    </Text>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {typingNames.length > 0 && (
          <div className="flex items-center gap-x-2 pt-1">
            <Text size="xsmall" className="text-ui-fg-muted italic">
              {typingNames.join(", ")} is typing…
            </Text>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-ui-border-base flex items-end gap-x-2 border-t px-4 pb-3 pt-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              sendFile(file)
            }
            e.target.value = ""
          }}
        />

        <DropdownMenu>
          <DropdownMenu.Trigger asChild>
            <IconButton
              variant="transparent"
              className="text-ui-fg-muted"
              disabled={sending}
            >
              <Plus />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content side="top" align="start">
            <DropdownMenu.Item
              className="gap-x-2"
              onClick={() => fileInputRef.current?.click()}
            >
              <PaperClip className="text-ui-fg-subtle" />
              Attach file
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="gap-x-2"
              onClick={() => setShareProductOpen(true)}
            >
              <Tag className="text-ui-fg-subtle" />
              Share product
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="gap-x-2"
              onClick={() => setQuotationOpen(true)}
            >
              <ReceiptPercent className="text-ui-fg-subtle" />
              Send quotation
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenu.Trigger asChild>
            <IconButton
              variant="transparent"
              className="text-ui-fg-muted"
              disabled={sending}
            >
              <Bolt />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content side="top" align="start" className="max-w-72">
            {QUICK_REPLIES.map((reply) => (
              <DropdownMenu.Item
                key={reply}
                onClick={() => setText((prev) => (prev ? `${prev} ${reply}` : reply))}
              >
                <span className="truncate">{reply}</span>
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu>

        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            notifyTyping()
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              sendText()
            }
          }}
          rows={1}
          placeholder="Type a message…"
          className="bg-ui-bg-field shadow-borders-base text-ui-fg-base placeholder:text-ui-fg-muted max-h-32 flex-1 resize-none rounded-xl px-4 py-2 text-sm outline-none focus:shadow-borders-interactive-with-active"
        />
        <IconButton
          variant="transparent"
          className="text-ui-fg-interactive"
          disabled={sending || !text.trim()}
          onClick={sendText}
        >
          {sending ? <Spinner className="animate-spin" /> : <ArrowUpCircleSolid />}
        </IconButton>
      </div>

      <ShareProductModal
        open={shareProductOpen}
        onOpenChange={setShareProductOpen}
        onSend={sendCard}
      />
      <SendQuotationModal
        open={quotationOpen}
        onOpenChange={setQuotationOpen}
        onSend={sendCard}
      />
    </div>
  )
}
