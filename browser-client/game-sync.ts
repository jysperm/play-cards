import Game from '../common/game'
import {Event, IMClient, TextMessage} from 'leancloud-realtime'

export function actionSyncController(imClient: IMClient): Promise<Game> {
  let game

  return new Promise( (resolve, reject) => {
    imClient.on(Event.MESSAGE, (message, conversation) => {
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
    })
  })
}

export function statusSyncContorller(imClient: IMClient): Promise<Game> {
  return null
}
