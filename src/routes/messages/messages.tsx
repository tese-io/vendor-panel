import { Container, Heading } from "@medusajs/ui"

import { MatrixInbox } from "../../components/matrix"

export const Messages = () => {
  return (
    <Container className="flex h-[calc(100dvh-79px)] min-h-[400px] flex-col divide-y overflow-hidden p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading>Messages</Heading>
      </div>
      <MatrixInbox className="min-h-0 flex-1" />
    </Container>
  )
}
