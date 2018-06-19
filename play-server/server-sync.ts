import {Realtime, TextMessage, Event, ConversationBase} from 'leancloud-realtime'
import * as _ from 'lodash'
import * as Promise from 'bluebird'

import Game from '../common/game'
import {RoomState, Player} from '../common/types'

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
  const masterClientId = `masterClient-${roomState.roomId}`

  return realtime.createIMClient(masterClientId).then( masterClient => {
    const game = new Game(roomState.seed, roomState.players)

    return Promise.map(roomState.players, (player: Player) => {
      return masterClient.createConversation({
        name: `masterClient for Room ${roomState.roomId}`,
        members: [player]
      }).then( conversation => {
        return conversation.send(new TextMessage(JSON.stringify({
          action: 'gameStarted',
          players: roomState.players
        }))).then( () => {
          return conversation
        })
      })
    }).then( conversations => {
      const conversationsByPlayer = _.zipObject(roomState.players, conversations)

      roomState.reconnected = (playerName) => {
        conversationsByPlayer[playerName].send(new TextMessage(JSON.stringify({
          action: 'gameStarted',
          players: roomState.players
        }))).then( () => {
          return conversationsByPlayer[playerName].send(new TextMessage(JSON.stringify({
            action: 'stateChanged',
            player: playerName,
            state: game.getState(playerName)
          })))
        })
      }

      masterClient.on(Event.MESSAGE, (message, conversation: ConversationBase) => {
        const payload = JSON.parse(message.text)
        const player = _.first(_.without(conversation.members, masterClientId))
        game.performAction(_.extend(payload, {player}))
      })

      game.on('stateChanged', () => {
        _.map(conversationsByPlayer, (conversation: ConversationBase, player: Player) => {
          conversation.send(new TextMessage(JSON.stringify({
            action: 'stateChanged',
            player: player,
            state: game.getState(player)
          })))
        })
      })

      game.on('error', err => {
        console.error(err)
      })

      game.dealCards()
    })
  })
}
