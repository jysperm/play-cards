import * as express from 'express'
import * as path from 'path'
import * as _ from 'lodash'
import * as Promise from 'bluebird'

import {Player, RoomState} from '../common/types'
import {actionSyncController, statusSyncContorller} from './server-sync'

const app: express.Application = express()

app.use(express.static(path.join(__dirname, '../browser-client/public')));

const waiting: Player[] = []
const rooms: RoomState[] = []

app.post('/join', (req, res) => {
  const {playerName} = req.query

  let roomState = _.find(rooms, ({players}) => _.includes(players, playerName))

  if (roomState && roomState.reconnected) {
    console.log(`${playerName} reconnected to room`)

    roomState.reconnected(playerName)
  } else {
    console.log(`${playerName} is waiting`)

    if (!_.includes(waiting, playerName)) {
      waiting.push(playerName)
    }
  }

  if (waiting.length >= 3) {
    const players = waiting.splice(0, 3)

    const roomState: RoomState = {
      roomId: _.uniqueId(),
      players: players,
      seed: Math.random().toString(),
    }

    rooms.push(roomState)

    console.log(`created room for ${players.join(',')}`)

    actionSyncController(roomState).catch( err => {
      console.error(err)
    })
  }

  res.sendStatus(204)
})

app.listen(process.env.LEANCLOUD_APP_PORT || 3000)
