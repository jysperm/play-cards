import {Realtime, TextMessage, Event} from 'leancloud-realtime'
import * as _ from 'lodash'
import * as React from 'react'
import * as ReactDOM from 'react-dom'

import Game from '../common/game'
import {Card, Player, GameState, Suit} from '../common/types'

const realtime = new Realtime({
  appId: 'oQlUIlfKQ23vzV8IEqyyqhfn-gzGzoHsz',
  appKey: 'VwM5MADbb8LOymj1lpmmqn45',
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
      <div className='peer-players'>
        <PeerPlayerComponent playerName={peerPlayers[0]} currentPlayer={this.state.currentPlayer}
          cardsCount={this.state.playersCardsCount[peerPlayers[0]]} />
        <PeerPlayerComponent playerName={peerPlayers[1]} currentPlayer={this.state.currentPlayer}
          cardsCount={this.state.playersCardsCount[peerPlayers[1]]} />
      </div>
      <PreviousCardsComponent playerName={this.state.previousCardsPlayer} cards={this.state.previousCards} />
      <MyCardsComponent cards={this.state.myCards} game={this.game} playerName={this.state.playerName}
        ableToPlay={this.state.currentPlayer === this.state.playerName}
        ableToPass={this.state.currentPlayer === this.state.playerName && !_.isEmpty(this.state.previousCards) } />
    </div>
  }

  public componentDidMount() {
    const querys = (new URL(location.href)).searchParams

    const playerName = querys.get('playerName') || prompt(`What's your name?`)

    this.setState({playerName})

    realtime.createIMClient(playerName).then( imClient => {
      fetch(`/join?playerName=${playerName}`, {method: 'post'})

      imClient.on(Event.MESSAGE, (message, conversation) => {
        const payload = JSON.parse(message.text)

        switch (payload.action) {
          case 'gameStarted':
            this.game = new Game(payload.seed, payload.players)

            this.game.on('stateChanged', () => {
              this.setState(this.game.getState(playerName))
            })

            this.game.on('action', payload => {
              conversation.send(new TextMessage(JSON.stringify(payload)))
            })

            this.game.on('error', err => {
              console.error(err)
            })

            this.game.dealCards()
            break
          case 'play':
            this.game.playCards(payload.player, payload.cards)
            break
          case 'pass':
            this.game.pass(payload.player)
            break
          default:
            console.error(`Unknown action ${payload.action}`)
        }
      })
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
  playerName: Player
  game: Game
  cards: Card[]
  ableToPlay: boolean
  ableToPass: boolean
}

interface MyCardState {
  selectedCards: Card[]
}

class MyCardsComponent extends React.Component<MyCardsProps, MyCardState> {
  state: MyCardState = {
    selectedCards: []
  }

  public render() {
    const ableToBeat = this.props.game && this.props.game.ableToBeatCards(this.state.selectedCards)

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
    this.props.game.playCards(this.props.playerName, this.state.selectedCards)

    this.setState({
      selectedCards: []
    })
  }

  protected onPass() {
    this.props.game.pass(this.props.playerName)

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
