import { Block, BlockType } from './types';

export const GRID_WIDTH = 4;
export const GRID_HEIGHT = 5;

// Classic "Heng Dao Li Ma" Layout
export const INITIAL_BLOCKS: Block[] = [
  // The King (Cao Cao) - 2x2
  { id: 'king', type: BlockType.KING, x: 1, y: 0, width: 2, height: 2, label: 'KING' },
  
  // Vertical Guards (Generals) - 1x2
  { id: 'v1', type: BlockType.VERTICAL, x: 0, y: 0, width: 1, height: 2, label: 'KNIGHT' },
  { id: 'v2', type: BlockType.VERTICAL, x: 3, y: 0, width: 1, height: 2, label: 'KNIGHT' },
  { id: 'v3', type: BlockType.VERTICAL, x: 0, y: 2, width: 1, height: 2, label: 'KNIGHT' },
  { id: 'v4', type: BlockType.VERTICAL, x: 3, y: 2, width: 1, height: 2, label: 'KNIGHT' },
  
  // Horizontal Guard (Guan Yu) - 2x1
  { id: 'h1', type: BlockType.HORIZONTAL, x: 1, y: 2, width: 2, height: 1, label: 'GENERAL' },
  
  // Pawns (Soldiers) - 1x1
  { id: 'p1', type: BlockType.PAWN, x: 1, y: 3, width: 1, height: 1, label: 'PAWN' },
  { id: 'p2', type: BlockType.PAWN, x: 2, y: 3, width: 1, height: 1, label: 'PAWN' },
  { id: 'p3', type: BlockType.PAWN, x: 0, y: 4, width: 1, height: 1, label: 'PAWN' },
  { id: 'p4', type: BlockType.PAWN, x: 3, y: 4, width: 1, height: 1, label: 'PAWN' },
];

export const WIN_COORDS = { x: 1, y: 3 }; // Top-left of King must be here to win (occupying 1,3 2,3 1,4 2,4)
