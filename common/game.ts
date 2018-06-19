import * as _ from 'lodash'
import * as EventEmitter from 'eventemitter3'
import * as seedrandom from 'seedrandom'

import {Suit, Card, PlayersCards, Player, GameState, GameAction, PlayersCardsCount} from '../common/types'

const suits: Suit[] = [Suit.Spade, Suit.Club, Suit.Heart, Suit.Diamond]

// events: action, stateChanged, error
export default class Game extends EventEmitter {
  private random: () => number

  private players: Player[]
  private playersCards: PlayersCards
  private playersCardsCount?: PlayersCardsCount

  private previousCards: Card[]
  private previousCardsPlayer?: Player
  private currentPlayer?: Player

  private winer?: Player

  constructor(seed: string, players: Player[]) {
    super()

    this.random = seedrandom(seed.toString())

    if (players.length !== 3) {
      throw new Error('Only 3 players is allowd')
    }

    this.playersCards = _.zipObject(players, [[], [], []])
    this.previousCards = []
    this.players = players.sort()
  }

  public getState(player: Player): GameState {
    return {
      players: this.players,
      playersCardsCount: this.playersCardsCount || _.mapValues(this.playersCards, cards => cards.length),

      myCards: this.playersCards[player],

      previousCards: this.previousCards,
      previousCardsPlayer: this.previousCardsPlayer,
      currentPlayer: this.currentPlayer,

      winer: this.winer
    }
  }

  public setState(player: Player, state: GameState) {
    this.players = state.players
    this.playersCardsCount = state.playersCardsCount
    this.playersCards[player] = state.myCards
    this.previousCards = state.previousCards
    this.previousCardsPlayer = state.previousCardsPlayer
    this.currentPlayer = state.currentPlayer
    this.winer = state.winer

    this.emit('stateChanged')
  }

  public dealCards() {
    const cards = _.flatten(_.range(1, 14).map( rank => {
      return suits.map( suit => {
        return newCard(suit, rank)
      })
    }))

    const players = _.keys(this.playersCards).sort()
    this.currentPlayer = players[0]

    while(true) {
      for (let i in players) {
        if (cards.length === 0) {
          this.emit('stateChanged')
          return
        }

        const cardIndex = Math.floor(this.random() * cards.length)

        this.playersCards[players[i]].push(cards[cardIndex])
        _.pullAt(cards, cardIndex)
      }
    }
  }

  public ableToBeatCards(cards: Card[]) {
    return ableToBeatCards(this.previousCards, cards)
  }

  public performAction(payload: GameAction) {
    this.applyAction(payload)
    this.emit('action', payload)
  }

  public applyAction(payload: GameAction) {
    switch (payload.action) {
      case 'playCards':
        return this.playCards(payload.player, payload.cards)
      case 'pass':
        return this.pass(payload.player)
    }
  }

  private playCards(player: Player, cards: Card[]) {
    if (this.currentPlayer !== player) {
      this.emit('error', new Error(`playCards: currentPlayer is not ${player}`))
      return
    }

    if (!ableToUseCards(this.playersCards[player], cards)) {
      this.emit('error', new Error(`playCards: No such cards to play: ${JSON.stringify(cards)}`))
      return
    }

    if (!ableToBeatCards(this.previousCards, cards)) {
      this.emit('error', new Error('playCards: Can not beat previous cards'))
      return
    }

    let latestPlayerCards = this.playersCards[player]

    cards.forEach( card => {
      latestPlayerCards = withoutFirst(latestPlayerCards, card)
    })

    this.playersCards[player] = latestPlayerCards
    this.previousCards = cards
    this.previousCardsPlayer = player

    if (_.isEmpty(latestPlayerCards)) {
      this.winer = player
    }

    this.nextPlayer()
  }

  private pass(player: Player) {
    if (this.currentPlayer !== player) {
      this.emit('error', new Error(`pass: currentPlayer is not ${player}`))
      return
    }

    if (_.isEmpty(this.previousCards)) {
      this.emit('error', new Error('pass: previous cards is empty'))
      return
    }

    this.nextPlayer()
  }

  private nextPlayer() {
    const currentPlayerIndex = this.players.indexOf(this.currentPlayer)

    if (currentPlayerIndex >= 2) {
      this.currentPlayer = this.players[0]
    } else {
      this.currentPlayer = this.players[currentPlayerIndex + 1]
    }

    if (this.currentPlayer === this.previousCardsPlayer) {
      this.previousCards = []
    }

    this.emit('stateChanged')
  }
}

function newCard(suit: Suit, rank: number): Card {
  return {suit, rank}
}

function ableToUseCards(playerCards: Card[], playingCards: Card[]): boolean {
  for (let i in playingCards) {
    if (_.find(playerCards, playingCards[i])) {
      playerCards = withoutFirst<Card>(playerCards, playingCards[i])
    } else {
      return false
    }
  }

  return true
}

function ableToBeatCards(previousCards: Card[], playingCards: Card[]): boolean {
  if (_.isEmpty(previousCards)) {
    return _.some([
      isSoloOrPairCards(playingCards),
      isTrioCards(playingCards),
      isChainCards(playingCards),
      isBomb(playingCards)
    ])
  } else {
    return _.some([
      ableToPlaySoloOrPairCards(previousCards, playingCards),
      ableToPlayTrioCards(previousCards, playingCards),
      ableToPlayChainCards(previousCards, playingCards),
      ableToPlayBomb(previousCards, playingCards)
    ])
  }
}

function withoutFirst<T>(array: Array<T>, item: T): Array<T> {
  let found = false

  return _.filter(array, (i) => {
    if (_.isMatch(i as Object, item as Object) && !found) {
      found = true
      return false
    } else {
      return true
    }
  })
}

function isSoloOrPairCards(playingCards: Card[]): boolean {
  if (playingCards.length === 2) {
    return playingCards[0].rank === playingCards[1].rank
  } else if (playingCards.length === 1) {
    return true
  }

  return false
}

function ableToPlaySoloOrPairCards(previousCards: Card[], playingCards: Card[]): boolean {
  if (isSoloOrPairCards(previousCards) && isSoloOrPairCards(playingCards)) {
    if (_.includes([1, 2], previousCards.length) && previousCards.length === playingCards.length) {
      return adjustedCardRank(playingCards[0]) > adjustedCardRank(previousCards[0])
    }
  }

  return false
}

function isTrioCards(playingCards: Card[]): boolean {
  const groups = _.groupBy(playingCards, 'rank')

  if (playingCards.length === 3) {
    return _.keys(groups).length === 1
  } else if (playingCards.length === 4) {
    return _.keys(groups).length === 2 && !!_.find(groups, {length: 3}) && !!_.find(groups, {length: 1})
  } else if (playingCards.length === 5) {
    return _.keys(groups).length === 2 && !!_.find(groups, {length: 3}) && !!_.find(groups, {length: 2})
  }

  return false
}

function ableToPlayTrioCards(previousCards: Card[], playingCards: Card[]): boolean {
  const previousTrioCards = _.find(_.groupBy(previousCards, 'rank'), {length: 3})
  const playingTrioCards = _.find(_.groupBy(playingCards, 'rank'), {length: 3})

  if (isTrioCards(previousCards) && isTrioCards(playingCards)) {
    if (previousCards.length === playingCards.length) {
      return adjustedCardRank(playingTrioCards[0]) > adjustedCardRank(previousTrioCards[0])
    }
  }

  return false
}

function isChainCards(playingCards: Card[]): boolean {
  const groups = _.groupBy(playingCards, adjustedCardRank)

  if (_.keys(_.groupBy(groups, 'length')).length === 1) {
    const ranks = _.sortBy(_.keys(groups).map( rank => parseInt(rank)))
    return _.isEqual(ranks, _.range(ranks[0], ranks[ranks.length - 1] + 1)) && _.keys(groups).length >= 3
  }

  return false
}

function ableToPlayChainCards(previousCards: Card[], playingCards: Card[]): boolean {
  const previousRanks = _.keys(_.groupBy(previousCards, 'rank')).map( rank => parseInt(rank)).sort()
  const playingRanks = _.keys(_.groupBy(playingCards, 'rank')).map( rank => parseInt(rank)).sort()

  if (isChainCards(previousCards) && isChainCards(playingCards)) {
    if (previousRanks.length === 0 || previousRanks.length === playingRanks.length) {
      return adjustedRank(playingRanks[0]) > adjustedRank(previousRanks[0])
    }
  }

  return false
}

function isBomb(playingCards: Card[]): boolean {
  const groups = _.groupBy(playingCards, 'rank')
  return playingCards.length === 4 && _.keys(groups).length === 1
}

function ableToPlayBomb(previousCards: Card[], playingCards: Card[]): boolean {
  return isBomb(playingCards) && (!isBomb(previousCards) || adjustedCardRank(playingCards[0]) >= adjustedCardRank(previousCards[0]))
}

function adjustedCardRank(card: Card): number {
  return adjustedRank(card.rank)
}

function adjustedRank(rank: number): number {
  if (rank <= 2) {
    return rank + 13
  } else {
    return rank
  }
}
