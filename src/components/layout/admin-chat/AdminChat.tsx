import { ChatBubble } from "@medusajs/icons"
import { Drawer, Heading, IconButton } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"

import { MatrixChat } from "../../matrix"
import { ensureAdminRoom } from "../../../lib/matrix/client"

export const AdminChat = () => {
  const [open, setOpen] = useState(false)

  // Get-or-create the seller<->support room lazily on first open.
  const { data: adminRoom } = useQuery({
    queryKey: ["matrix", "admin-room"],
    queryFn: ensureAdminRoom,
    enabled: open,
    staleTime: Infinity,
  })

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <IconButton
          variant="transparent"
          className="text-ui-fg-muted hover:text-ui-fg-subtle"
        >
          <ChatBubble />
        </IconButton>
      </Drawer.Trigger>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title asChild>
            <Heading>Chat with admin</Heading>
          </Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="overflow-y-auto px-4">
          {adminRoom?.room_id && (
            <MatrixChat
              roomId={adminRoom.room_id}
              className="h-full"
              header={false}
            />
          )}
        </Drawer.Body>
      </Drawer.Content>
    </Drawer>
  )
}
