import { Block, BlockType } from './types';

export const GRID_WIDTH = 4;
export const GRID_HEIGHT = 5;

// Helper to create blocks
const createBlock = (id: string, type: BlockType, x: number, y: number, label?: string): Block => {
  let width = 1, height = 1;
  let l = label;
  if (type === BlockType.KING) { width = 2; height = 2; l = l || 'KING'; }
  else if (type === BlockType.VERTICAL) { width = 1; height = 2; l = l || 'KNIGHT'; }
  else if (type === BlockType.HORIZONTAL) { width = 2; height = 1; l = l || 'GENERAL'; }
  else if (type === BlockType.PAWN) { width = 1; height = 1; l = l || 'PAWN'; }
  return { id, type, x, y, width, height, label: l };
};

export const LEVELS: Record<string, Block[]> = {
  EASY: [
    // "The Front Line" - King is closer, fewer obstructions
    createBlock('k', BlockType.KING, 1, 1),
    createBlock('v1', BlockType.VERTICAL, 0, 0),
    createBlock('v2', BlockType.VERTICAL, 3, 0),
    createBlock('h1', BlockType.HORIZONTAL, 1, 0),
    createBlock('p1', BlockType.PAWN, 0, 2),
    createBlock('p2', BlockType.PAWN, 3, 2),
    createBlock('p3', BlockType.PAWN, 0, 3),
    createBlock('p4', BlockType.PAWN, 3, 3),
    createBlock('h2', BlockType.HORIZONTAL, 1, 3), 
  ],
  MEDIUM: [
    // "Containment" - A bit trickier than Easy
    createBlock('k', BlockType.KING, 1, 0),
    createBlock('v1', BlockType.VERTICAL, 0, 0),
    createBlock('v2', BlockType.VERTICAL, 3, 0),
    createBlock('h1', BlockType.HORIZONTAL, 1, 2),
    createBlock('v3', BlockType.VERTICAL, 0, 2),
    createBlock('v4', BlockType.VERTICAL, 3, 2),
    createBlock('p1', BlockType.PAWN, 1, 3),
    createBlock('p2', BlockType.PAWN, 2, 3),
    createBlock('p3', BlockType.PAWN, 0, 4),
    createBlock('p4', BlockType.PAWN, 3, 4),
  ],
  HARD: [
    // Classic "Heng Dao Li Ma" (The original hard layout)
    createBlock('k', BlockType.KING, 1, 0),
    createBlock('v1', BlockType.VERTICAL, 0, 0),
    createBlock('v2', BlockType.VERTICAL, 3, 0),
    createBlock('v3', BlockType.VERTICAL, 0, 2),
    createBlock('v4', BlockType.VERTICAL, 3, 2),
    createBlock('h1', BlockType.HORIZONTAL, 1, 2),
    createBlock('p1', BlockType.PAWN, 1, 3),
    createBlock('p2', BlockType.PAWN, 2, 3),
    createBlock('p3', BlockType.PAWN, 0, 4),
    createBlock('p4', BlockType.PAWN, 3, 4),
  ]
};

export const INITIAL_BLOCKS = LEVELS.HARD; // Default

export const WIN_COORDS = { x: 1, y: 3 }; // Top-left of King must be here to win