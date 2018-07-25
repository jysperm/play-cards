import {play, Event, Region, ReceiverGroup} from '@leancloud/play'
import Game from '../common/game'

play.init({
  appId: 'AaU1irN3dpcBUb9VINnB0yot-gzGzoHsz',
  appKey: '6R0akkHpnHe7kOr3Kz6PJTcO',
  region: Region.NorthChina
})

export function actionSyncController(roomName: string, playerName: string): Promise<Game> {
  return new Promise( (resolve, reject) => {
    let game

    play.on(Event.CONNECT_FAILED, err => {
      console.error(err)
    })

    play.once(Event.LOBBY_JOINED, () => {
      play.joinRoom(roomName)
    })

    play.on(Event.ROOM_JOIN_FAILED, err => {
      console.error(err)
    })

    play.on(Event.CUSTOM_EVENT, ({eventId, eventData, senderId}) => {
      try {
        console.log('[Received]', senderId, eventId, eventData)

        switch (eventId) {
          case 'gameStarted':
            if (!game) {
              game = new Game(eventData.seed, eventData.players)

              game.on('action', payload => {
                console.log('[Send]', JSON.stringify(payload))

                play.sendEvent(payload.action, payload, {
                  receiverGroup: ReceiverGroup.Others
                })
              })

              game.on('error', err => {
                console.error(err)
              })

              game.dealCards()

              resolve(game)
            }
            break
          default:
            if (!game) {
              console.error('Game have not started')
            } else {
              eventData.action = eventId
              game.applyAction(eventData)
            }
        }
      } catch (err) {
        console.error(err)
      }
    })

    play.userId = playerName
    play.connect()
  })
}

export function statusSyncContorller(roomName: string, playerName: string): Promise<Game> {
  return new Promise( (resolve, reject) => {
    let game

    play.on(Event.CONNECT_FAILED, err => {
      console.error(err)
    })

    play.once(Event.LOBBY_JOINED, () => {
      play.joinRoom(roomName)
    })

    play.on(Event.ROOM_JOIN_FAILED, err => {
      console.error(err)
    })

    play.on(Event.CUSTOM_EVENT, ({eventId, eventData, senderId}) => {
      try {
        console.log('[Received]', senderId, eventId, eventData)

        switch (eventId) {
          case 'gameStarted':
            if (!game) {
              game = new Game('', eventData.players)

              game.on('action', payload => {
                console.log('[Send]', JSON.stringify(payload))

                play.sendEvent(payload.action, payload, {
                  receiverGroup: ReceiverGroup.MasterClient
                })
              })

              game.on('error', err => {
                console.error(err)
              })

              resolve(game)
            }
            break
          case 'stateChanged':
            if (!game) {
              console.error('Game have not started')
            } else {
              game.setState(eventData.player, eventData.state)
            }
        }
      } catch (err) {
        console.error(err)
      }
    })

    play.userId = playerName
    play.connect()
  })
}
