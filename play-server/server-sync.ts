import {Realtime, TextMessage, Event} from 'leancloud-realtime'

import {RoomState} from '../common/types'

const realtime = new Realtime({
  appId: process.env.LEANCLOUD_APP_ID,
  appKey: process.env.LEANCLOUD_APP_KEY
})

export function actionSyncController(roomState: RoomState) {
  return realtime.createIMClient(`masterClient-${roomState.roomId}`).then( masterClient => {
    return masterClient.createConversation({
      name: `Game room ${roomState.roomId}`,
      members: roomState.players
    }).then( conversation => {
      roomState.reconnected = (playerName) => {
        conversation.send(new TextMessage(JSON.stringify({
          action: 'gameStarted',
          players: roomState.players,
          seed: roomState.seed
        })))
      }

      conversation.send(new TextMessage(JSON.stringify({
        action: 'gameStarted',
        players: roomState.players,
        seed: roomState.seed
      })))
    })
  })
}

export function statusSyncContorller(roomState: RoomState) {

}
