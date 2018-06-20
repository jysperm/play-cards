import Game from '../common/game'
import {GameState} from '../common/types'
import {Event, IMClient, TextMessage, ConversationBase} from 'leancloud-realtime'

export function actionSyncController(imClient: IMClient): Promise<Game> {
  let game

  return new Promise( (resolve, reject) => {
    // FIXME: tsd of leancloud.realtime
    imClient.on(Event.MESSAGE.toString(), (message, conversation: ConversationBase) => {
      try {
        console.log('[Received]', message.from, message.text)

        const payload = JSON.parse(message.text)

        switch (payload.action) {
          case 'gameStarted':
            if (!game) {
              game = new Game(payload.seed, payload.players)

              game.on('action', payload => {
                console.log('[Send]', JSON.stringify(payload))
                conversation.send(new TextMessage(JSON.stringify(payload)))
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
              game.applyAction(payload)
            }
        }
      } catch (err) {
        console.error(err)
      }
    })
  })
}

export function statusSyncContorller(imClient: IMClient): Promise<Game> {
  let game

  return new Promise( (resolve, reject) => {
    // FIXME: tsd of leancloud.realtime
    imClient.on(Event.MESSAGE.toString(), (message, conversation: ConversationBase) => {
      try {
        console.log('[Received]', message.from, message.text)

        const payload = JSON.parse(message.text)

        switch (payload.action) {
          case 'gameStarted':
            if (!game) {
              game = new Game('', payload.players)

              game.on('action', payload => {
                console.log('[Send]', JSON.stringify(payload))
                conversation.send(new TextMessage(JSON.stringify(payload)))
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
              game.setState(payload.player, payload.state)
            }
        }
      } catch (err) {
        console.error(err)
      }
    })
  })
}
