export enum Suit {
  Spade = 'Spade',
  Club = 'Club',
  Heart = 'Heart',
  Diamond = 'Diamond'
}

export const suits: Suit[] = [Suit.Spade, Suit.Club, Suit.Heart, Suit.Diamond]

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
