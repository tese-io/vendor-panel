import { createClient, MatrixClient } from 'matrix-js-sdk'

import { fetchQuery } from '../client/client'

export type MatrixCredentials = {
  access_token: string
  user_id: string
  homeserver_url: string
}

export type MatrixAdminRoomResponse = {
  room_id: string
  room_alias: string
  admin_matrix_id: string
  seller_matrix_id: string
}

export const fetchMatrixCredentials = (): Promise<MatrixCredentials> =>
  fetchQuery('/vendor/matrix/token', { method: 'POST' })

export const ensureAdminRoom = (): Promise<MatrixAdminRoomResponse> =>
  fetchQuery('/vendor/matrix/admin-room', { method: 'POST' })

export const createMatrixSession = async (): Promise<MatrixClient> => {
  const creds = await fetchMatrixCredentials()

  const client = createClient({
    baseUrl: creds.homeserver_url,
    accessToken: creds.access_token,
    userId: creds.user_id,
    useAuthorizationHeader: true
  })

  await client.startClient({ initialSyncLimit: 20, lazyLoadMembers: true })

  return client
}
