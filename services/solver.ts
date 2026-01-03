import { Block, BlockType, Direction } from '../types';
import { GRID_WIDTH, GRID_HEIGHT } from '../constants';

export interface SimplifiedMove {
  blockIndex: number;
  direction: Direction;
}

interface SolverBlock {
  type: BlockType;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SolverState {
  blocks: SolverBlock[];
  path: SimplifiedMove[];
}

// Create a unique hash for the board state to detect visited states.
// We map block types to integers: 1=King, 2=Vertical, 3=Horizontal, 4=Pawn.
// 0 represents empty space.
const encodeState = (blocks: SolverBlock[]): string => {
  const grid = new Int8Array(GRID_WIDTH * GRID_HEIGHT).fill(0);
  
  for (const b of blocks) {
    let code = 0;
    if (b.type === BlockType.KING) code = 1;
    else if (b.type === BlockType.VERTICAL) code = 2;
    else if (b.type === BlockType.HORIZONTAL) code = 3;
    else if (b.type === BlockType.PAWN) code = 4;
    
    for (let dy = 0; dy < b.height; dy++) {
      for (let dx = 0; dx < b.width; dx++) {
        const idx = (b.y + dy) * GRID_WIDTH + (b.x + dx);
        grid[idx] = code;
      }
    }
  }
  return grid.join('');
};

const isSolved = (blocks: SolverBlock[]): boolean => {
  const k = blocks.find(b => b.type === BlockType.KING);
  // King must reach (1, 3)
  return k ? (k.x === 1 && k.y === 3) : false;
};

// Check if a specific block can move in a direction
const canMove = (movingBlockIndex: number, dir: Direction, allBlocks: SolverBlock[]): boolean => {
  const b = allBlocks[movingBlockIndex];
  let nx = b.x;
  let ny = b.y;
  
  if (dir === Direction.UP) ny--;
  else if (dir === Direction.DOWN) ny++;
  else if (dir === Direction.LEFT) nx--;
  else if (dir === Direction.RIGHT) nx++;
  
  // 1. Boundary Check
  if (nx < 0 || ny < 0 || nx + b.width > GRID_WIDTH || ny + b.height > GRID_HEIGHT) {
    return false;
  }
  
  // 2. Collision Check (AABB vs all other blocks)
  for (let i = 0; i < allBlocks.length; i++) {
    if (i === movingBlockIndex) continue;
    const other = allBlocks[i];
    
    // Check overlap
    if (nx < other.x + other.width &&
        nx + b.width > other.x &&
        ny < other.y + other.height &&
        ny + b.height > other.y) {
      return false; // Collision detected
    }
  }
  
  return true;
};

export const findSolution = (initialBlocks: Block[], maxDepth = 200): SimplifiedMove[] | null => {
  // Convert full Block objects to lighter SolverBlock objects
  // The order in the array is preserved, so blockIndex 0 is always block 0.
  const startBlocks: SolverBlock[] = initialBlocks.map(b => ({
    type: b.type, x: b.x, y: b.y, width: b.width, height: b.height
  }));
  
  const startHash = encodeState(startBlocks);
  if (isSolved(startBlocks)) return [];
  
  const queue: SolverState[] = [{ blocks: startBlocks, path: [] }];
  const visited = new Set<string>();
  visited.add(startHash);
  
  let head = 0;
  const MAX_ITERATIONS = 50000; // Safety limit
  
  while(head < queue.length) {
    if (head > MAX_ITERATIONS) return null; // Too complex or stuck
    
    const current = queue[head++];
    
    // Try moving each block in each direction
    for (let i = 0; i < current.blocks.length; i++) {
      const dirs = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
      
      for (const dir of dirs) {
        if (canMove(i, dir, current.blocks)) {
          // Clone blocks
          const newBlocks = current.blocks.map(b => ({...b}));
          
          // Apply move
          if (dir === Direction.UP) newBlocks[i].y--;
          else if (dir === Direction.DOWN) newBlocks[i].y++;
          else if (dir === Direction.LEFT) newBlocks[i].x--;
          else if (dir === Direction.RIGHT) newBlocks[i].x++;
          
          const hash = encodeState(newBlocks);
          
          if (!visited.has(hash)) {
            const newPath = [...current.path, { blockIndex: i, direction: dir }];
            
            if (isSolved(newBlocks)) {
              return newPath;
            }
            
            if (newPath.length < maxDepth) {
              visited.add(hash);
              queue.push({ blocks: newBlocks, path: newPath });
            }
          }
        }
      }
    }
  }
  
  return null; // No solution found
};