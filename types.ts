export enum BlockType {
  KING = 'KING',
  VERTICAL = 'VERTICAL',
  HORIZONTAL = 'HORIZONTAL',
  PAWN = 'PAWN'
}

export interface Block {
  id: string;
  type: BlockType;
  x: number; // 0-3
  y: number; // 0-4
  width: number;
  height: number;
  label?: string;
}

export interface GameState {
  blocks: Block[];
  selectedBlockId: string | null;
  moves: number;
  isWon: boolean;
}

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}