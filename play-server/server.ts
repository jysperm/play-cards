import * as express from 'express'
import * as path from 'path'
import * as _ from 'lodash'
import * as Promise from 'bluebird'
import {Realtime, TextMessage, Event, ConversationBase} from 'leancloud-realtime'

const realtime = new Realtime({
  appId: process.env.LEANCLOUD_APP_ID,
  appKey: process.env.LEANCLOUD_APP_KEY
})

import {Player} from '../common/types'

interface RoomState {
  players: Player[],
  seed: string,
  conversation: ConversationBase
}

let waiting: string[] = []
let rooms: {[player: string]: RoomState} = {}

const app: express.Application = express()

app.use(express.static(path.join(__dirname, '../browser-client/public')));

app.post('/join', (req, res) => {
  if (rooms[req.query.playerName]) {
    console.log(`${req.query.playerName} reconnected to room`)
    const roomState = rooms[req.query.playerName]

    roomState.conversation.send(new TextMessage(JSON.stringify({
      action: 'gameStarted',
      players: roomState.players,
      seed: roomState.seed
    })))
  } else {
    console.log(`${req.query.playerName} is waiting`)
    waiting = _.uniq(waiting.concat(req.query.playerName))
  }

  if (waiting.length >= 3) {
    createMasterClient(waiting.splice(0, 3))
  }

  res.sendStatus(204)
})

app.listen(process.env.LEANCLOUD_APP_PORT || 3000)

function createMasterClient(players: string[]) {
  const roomId = _.uniqueId()

  console.log(`created room for ${players.join(',')}`)

  return realtime.createIMClient(`masterClient-${roomId}`).then( masterClient => {
    return masterClient.createConversation({
      name: `Game room ${roomId}`,
      members: players
    }).then( conversation => {
      const roomState: RoomState = {
        players: players,
        seed: Math.random().toString(),
        conversation: conversation
      }

      players.map( player => {
        rooms[player] = roomState
      })

      conversation.send(new TextMessage(JSON.stringify({
        action: 'gameStarted',
        players: roomState.players,
        seed: roomState.seed
      })))
    })
  }).catch( err => {
    console.error(err)
  })
}
