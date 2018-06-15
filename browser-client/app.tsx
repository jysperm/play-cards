import {Realtime, TextMessage, Event} from 'leancloud-realtime'
import * as _ from 'lodash'
import * as React from 'react'
import * as ReactDOM from 'react-dom'

import {actionSyncController, statusSyncContorller} from './game-sync'
import {Card, Player, GameState, Suit} from '../common/types'
import Game from '../common/game'

const realtime = new Realtime({
  appId: 'AaU1irN3dpcBUb9VINnB0yot-gzGzoHsz',
  appKey: '6R0akkHpnHe7kOr3Kz6PJTcO',
})

interface GameComponentState extends GameState {
  playerName?: Player
}

class GameComponent extends React.Component<Object, GameComponentState> {
  state: GameComponentState = {
    players: [],
    playersCardsCount: {},
    myCards: [],
    previousCards: []
  }

  game: Game

  public render() {
    const peerPlayers = _.without(this.state.players, this.state.playerName)

    return <div className='game-component'>
      {this.state.currentPlayer ? undefined : <div className='overlay'>等待游戏开始</div>}
      {this.state.winer && <div className='overlay'>玩家 {this.state.winer} 获胜</div>}
      <div className='peer-players'>
        <PeerPlayerComponent playerName={peerPlayers[0]} currentPlayer={this.state.currentPlayer}
          cardsCount={this.state.playersCardsCount[peerPlayers[0]]} />
        <PeerPlayerComponent playerName={peerPlayers[1]} currentPlayer={this.state.currentPlayer}
          cardsCount={this.state.playersCardsCount[peerPlayers[1]]} />
      </div>
      <PreviousCardsComponent playerName={this.state.previousCardsPlayer} cards={this.state.previousCards} />
      <MyCardsComponent cards={this.state.myCards} ableToPlay={this.state.currentPlayer === this.state.playerName}
        ableToPass={this.state.currentPlayer === this.state.playerName && !_.isEmpty(this.state.previousCards) }
        ableToBeatCards={this.game ? this.game.ableToBeatCards : _.constant(false)}
        playCards={this.playCards.bind(this)} pass={this.pass.bind(this)}
        />
    </div>
  }

  public componentDidMount() {
    const querys = (new URL(location.href)).searchParams

    const playerName = querys.get('playerName') || prompt(`What's your name?`)

    this.setState({playerName})

    realtime.createIMClient(playerName).then( imClient => {
      return fetch(`/join?playerName=${playerName}`, {method: 'post'}).then( res => {
        if (!res.ok) {
          return res.text().then( body => {
            throw new Error(body)
          })
        }

        return actionSyncController(imClient).then( game => {
          this.game = game

          game.on('stateChanged', () => {
            this.setState(game.getState(this.state.playerName))
          })

          this.setState(game.getState(this.state.playerName))
        })
      })
    }).catch( err => {
      console.error(err)
    })
  }

  public playCards(cards: Card[]) {
    this.game.performAction({
      action: 'playCards',
      player: this.state.playerName,
      cards: cards
    })
  }

  public pass() {
    this.game.performAction({
      action: 'pass',
      player: this.state.playerName
    })
  }
}

interface PeerPlayerProps {
  playerName: Player
  currentPlayer: Player
  cardsCount: number
}

class PeerPlayerComponent extends React.Component<PeerPlayerProps, Object> {
  public render() {
    return <div className='peer-player'>
      <span>
        {this.props.playerName}</span> <span>🃏 x {this.props.cardsCount}
        {this.props.currentPlayer === this.props.playerName ? '⏰（正在出牌）' : ''}
      </span>
    </div>
  }
}

interface PreviousCardsProps {
  playerName: Player
  cards: Card[]
}

class PreviousCardsComponent extends React.Component<PreviousCardsProps, Object> {
  public render() {
    return <div className='previous-cards'>
      <h2>前一玩家出牌（{this.props.playerName}）</h2>
      <CardsComponent cards={this.props.cards} />
    </div>
  }
}

interface MyCardsProps {
  cards: Card[]
  ableToPlay: boolean
  ableToPass: boolean

  ableToBeatCards(cards: Card[])
  playCards(cards: Card[])
  pass()
}

interface MyCardState {
  selectedCards: Card[]
}

class MyCardsComponent extends React.Component<MyCardsProps, MyCardState> {
  state: MyCardState = {
    selectedCards: []
  }

  public render() {
    const ableToBeat = this.props.ableToBeatCards(this.state.selectedCards)

    return <div className='my-cards'>
      <div>
        <button type='button' disabled={!this.props.ableToPlay || !ableToBeat} onClick={this.onPlay.bind(this)}>出牌</button>
        <button type='button' disabled={!this.props.ableToPass} onClick={this.onPass.bind(this)}>放弃</button>
        <span className='message'>{!_.isEmpty(this.state.selectedCards) && !ableToBeat ? '无法管上前一玩家出牌' : ''}</span>
      </div>
      <h2>我的手牌 {this.props.ableToPlay ? '⏰（正在出牌）' : ''}</h2>
      <CardsComponent cards={this.props.cards} selectedCards={this.state.selectedCards} onCardClick={this.onCardClicked.bind(this)} />
    </div>
  }

  protected onCardClicked(card: Card) {
    if (this.state.selectedCards.indexOf(card) !== -1) {
      this.setState({
        selectedCards: _.without(this.state.selectedCards, card)
      })
    } else {
      this.setState({
        selectedCards: this.state.selectedCards.concat(card)
      })
    }
  }

  protected onPlay() {
    this.props.playCards(this.state.selectedCards)

    this.setState({
      selectedCards: []
    })
  }

  protected onPass() {
    this.props.pass()

    this.setState({
      selectedCards: []
    })
  }
}

interface CardsProps {
  cards: Card[]
  selectedCards?: Card[]
  onCardClick?(card: Card)
}

class CardsComponent extends React.Component<CardsProps, Object> {
  public render() {
    return <div className='cards'>
      {_.sortBy(this.props.cards, 'rank').map( card => {
        return <CardComponent key={`${card.suit}-${card.rank}`} card={card}
          selected={this.props.selectedCards && this.props.selectedCards.indexOf(card) !== -1}
          onClick={this.props.onCardClick && this.props.onCardClick.bind(null, card)} />
      })}
    </div>
  }
}

interface CardProps {
  card: Card
  selected: boolean
  onClick()
}

class CardComponent extends React.Component<CardProps, Object> {
  emojiOfCard: {[suit: string]: string} = {
    'Spade': '♠️',
    'Club': '♣️',
    'Heart': '♥️',
    'Diamond': '♦️'
  }

  public render() {
    return <div className={`card${this.props.selected ? ' selected' : ''}`} onClick={this.props.onClick}>
      <span className='card-suit'>{this.emojiOfCard[this.props.card.suit]}</span>
      <span className='card-rank'>{this.props.card.rank}</span>
    </div>
  }
}

if (typeof document == 'object') {
  ReactDOM.render(<GameComponent />, document.getElementById('game-component'))
}
