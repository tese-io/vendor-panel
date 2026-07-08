import {
  ClientEvent,
  MatrixClient,
  NotificationCountType,
  Room,
  RoomEvent,
  SyncState,
} from "matrix-js-sdk"
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react"

import { createMatrixSession } from "../../lib/matrix/client"

type MatrixContextValue = {
  client: MatrixClient | null
  /** True once the first sync completed and rooms/timelines are usable. */
  ready: boolean
}

const MatrixContext = createContext<MatrixContextValue>({
  client: null,
  ready: false,
})

/**
 * Starts a Matrix session for the authenticated seller and keeps it alive
 * for the whole app (replaces the TalkJS <Session> provider). Renders
 * children immediately — chat surfaces gate on `ready` themselves.
 */
export const MatrixProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [client, setClient] = useState<MatrixClient | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let disposed = false
    let session: MatrixClient | null = null

    createMatrixSession()
      .then((matrixClient) => {
        if (disposed) {
          matrixClient.stopClient()
          return
        }
        session = matrixClient

        const onSync = (state: SyncState) => {
          if (state === SyncState.Prepared) {
            setReady(true)
          }
        }
        matrixClient.on(ClientEvent.Sync, onSync)

        // Rooms are normally force-joined server-side; accept any stray
        // invite (e.g. created while this client was offline) automatically.
        matrixClient.on(RoomEvent.MyMembership, (room, membership) => {
          if (membership === "invite") {
            matrixClient.joinRoom(room.roomId).catch(() => {})
          }
        })

        setClient(matrixClient)
      })
      .catch((error) => {
        console.error("Matrix session could not be started", error)
      })

    return () => {
      disposed = true
      session?.stopClient()
    }
  }, [])

  return (
    <MatrixContext.Provider value={{ client, ready }}>
      {children}
    </MatrixContext.Provider>
  )
}

export const useMatrix = () => useContext(MatrixContext)

const sortByActivity = (rooms: Room[]) =>
  [...rooms].sort(
    (a, b) => b.getLastActiveTimestamp() - a.getLastActiveTimestamp()
  )

/** Joined rooms, most recently active first; live-updates with sync. */
export const useMatrixRooms = (): Room[] => {
  const { client, ready } = useMatrix()
  const [rooms, setRooms] = useState<Room[]>([])

  useEffect(() => {
    if (!client || !ready) {
      return
    }

    const update = () =>
      setRooms(
        sortByActivity(
          client.getRooms().filter((room) => room.getMyMembership() === "join")
        )
      )

    update()

    const events = [
      ClientEvent.Room,
      ClientEvent.DeleteRoom,
      RoomEvent.Timeline,
      RoomEvent.Name,
      RoomEvent.MyMembership,
      RoomEvent.Receipt,
      RoomEvent.UnreadNotifications,
    ] as const
    events.forEach((event) => client.on(event as any, update))

    return () => {
      events.forEach((event) => client.removeListener(event as any, update))
    }
  }, [client, ready])

  return rooms
}

/** Total unread message count across all rooms (replaces TalkJS useUnreads). */
export const useMatrixUnreads = (): number => {
  const rooms = useMatrixRooms()

  return rooms.reduce(
    (sum, room) =>
      sum + (room.getUnreadNotificationCount(NotificationCountType.Total) || 0),
    0
  )
}
