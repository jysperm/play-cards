import * as express from 'express'
import * as path from 'path'
import * as _ from 'lodash'

import {Player, RoomState} from '../common/types'
import {actionSyncController, statusSyncContorller} from './server-sync'

const app: express.Application = express()

app.use(express.static(path.join(__dirname, '../browser-client/public')));

let waiting: {[player: string]: express.Response} = {}

app.post('/join', (req, res) => {
  const {playerName} = req.query

  console.log(`${playerName} is waiting`)

  if (!waiting[playerName]) {
    waiting[playerName] = res
  }

  if (_.keys(waiting).length >= 3) {
    const players = _.keys(waiting).splice(0, 3)
    const responses = _.values(_.pick(waiting, players))
    waiting = _.omit(waiting, players)

    const roomState: RoomState = {
      roomId: _.uniqueId(),
      players: players,
      seed: Math.random().toString()
    }

    console.log(`created room for ${players.join(',')}`)

    statusSyncContorller(roomState).then( play => {
      responses.forEach( res => {
        res.json({
          roomName: play.room.name
        })
      })
    }).catch( err => {
      console.error(err)
    })
  }
})

app.listen(process.env.LEANCLOUD_APP_PORT || 3000)
