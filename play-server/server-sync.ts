import {Play, Event, Region} from '@leancloud/play'
import * as _ from 'lodash'
import * as Promise from 'bluebird'

import Game from '../common/game'
import {RoomState, GameAction} from '../common/types'

export function actionSyncController(roomState: RoomState): Promise<Play> {
  return new Promise( (resolve, reject) => {
    const play = initPlay(`master-${roomState.roomId}`)

    play.on(Event.CONNECT_FAILED, err => {
      console.error(err)
    })

    play.once(Event.LOBBY_JOINED, () => {
      play.createRoom({
        expectedUserIds: roomState.players
      })
    })

    play.once(Event.ROOM_JOIN_FAILED, err => {
      reject(err)
    });

    play.once(Event.ROOM_JOINED, () => {
      resolve(play)
    });

    play.on(Event.PLAYER_ROOM_JOINED, ({newPlayer}) => {
      play.sendEvent('gameStarted', {
        players: roomState.players,
        seed: roomState.seed
      }, {
        targetActorIds: [newPlayer.actorId]
      })
    })

    play.connect()
  })
}

export function statusSyncContorller(roomState: RoomState): Promise<Play> {
  return new Promise( (resolve, reject) => {
    const play = initPlay(`master-${roomState.roomId}`)
    const game = new Game(roomState.seed, roomState.players)

    play.on(Event.CONNECT_FAILED, err => {
      console.error(err)
    })

    play.once(Event.LOBBY_JOINED, () => {
      play.createRoom({
        expectedUserIds: roomState.players
      })
    })

    play.on(Event.ROOM_JOIN_FAILED, err => {
      reject(err)
    });

    play.on(Event.ROOM_JOINED, () => {
      game.dealCards()
      resolve(play)
    });

    play.on(Event.PLAYER_ROOM_JOINED, ({newPlayer}) => {
      play.sendEvent('gameStarted', {
        players: roomState.players
      }, {
        targetActorIds: [newPlayer.actorId]
      })

      play.sendEvent('stateChanged', {
        player: newPlayer.userId,
        state: game.getState(newPlayer.userId)
      }, {
        targetActorIds: [newPlayer.actorId]
      })
    })

    play.on(Event.CUSTOM_EVENT, ({eventId, eventData, senderId}) => {
      eventData.action = eventId
      eventData.player = play.room.getPlayer(senderId).userId
      game.performAction(eventData as GameAction)
    })

    game.on('error', err => {
      console.error(err)
    })

    game.on('stateChanged', () => {
      roomState.players.map( playerName => {
        const player = _.find(play.room.playerList, {userId: playerName})

        if (player) {
          play.sendEvent('stateChanged', {
            player: playerName,
            state: game.getState(playerName)
          }, {
            targetActorIds: [player.actorId]
          })
        }
      })
    })

    play.connect()
  })
}

function initPlay(userId: string): Play {
  const play = new Play()

  play.init({
    appId: 'AaU1irN3dpcBUb9VINnB0yot-gzGzoHsz',
    appKey: '6R0akkHpnHe7kOr3Kz6PJTcO',
    region: Region.NorthChina
  })

  play.userId = userId

  return play
}
