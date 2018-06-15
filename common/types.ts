export enum Suit {
  Spade = 'Spade',
  Club = 'Club',
  Heart = 'Heart',
  Diamond = 'Diamond'
}

export interface Card {
  suit: Suit
  rank: number
  selected?: boolean
}

export interface PlayersCards {
  [player: string]: Card[]
}

export interface PlayersCardsCount {
  [player: string]: number
}

export type Player = string

export interface GameState {
  players: Player[]
  playersCardsCount: PlayersCardsCount

  myCards: Card[]

  previousCards: Card[]
  previousCardsPlayer?: Player
  currentPlayer?: Player

  winer?: Player
}

export type GameAction = PlayCardsAction | PassAction

export interface PlayCardsAction {
  action: 'playCards'
  player: Player
  cards: Card[]
}

export interface PassAction {
  action: 'pass'
  player: Player
}

export interface RoomState {
  roomId: string
  players: Player[]
  seed: string
  reconnected?(player: Player)
}
