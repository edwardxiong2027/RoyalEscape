import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Block, BlockType, Direction } from '../types';
import { GRID_WIDTH, GRID_HEIGHT, WIN_COORDS } from '../constants';
import { BlockComponent } from './BlockComponent';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw, Lightbulb, Play, Settings2 } from 'lucide-react';
import { findSolution, SimplifiedMove } from '../services/solver';

interface GameBoardProps {
  blocks: Block[];
  setBlocks: React.Dispatch<React.SetStateAction<Block[]>>;
  moves: number;
  setMoves: React.Dispatch<React.SetStateAction<number>>;
  onWin: () => void;
  onReset: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({ blocks, setBlocks, moves, setMoves, onWin, onReset }) => {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  
  // Hint State
  const [isSolving, setIsSolving] = useState(false);
  const [isPlayingHint, setIsPlayingHint] = useState(false);
  const [hintSteps, setHintSteps] = useState(1);
  const [hintMessage, setHintMessage] = useState<string | null>(null);

  // Responsive sizing
  const containerRef = useRef<HTMLDivElement>(null);
  const [unitSize, setUnitSize] = useState(80);
  const gap = 10; 

  // Resize Observer
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      
      const padding = 32; 
      const controlsHeight = 140; 
      const availableHeight = clientHeight - controlsHeight - padding;
      const availableWidth = clientWidth - padding;

      const maxUnitW = (availableWidth - (GRID_WIDTH - 1) * gap) / GRID_WIDTH;
      const maxUnitH = (availableHeight - (GRID_HEIGHT - 1) * gap) / GRID_HEIGHT;

      setUnitSize(Math.floor(Math.min(maxUnitW, maxUnitH)));
    };

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef.current);
    updateSize();

    return () => resizeObserver.disconnect();
  }, []);

  const getOccupiedCells = useCallback((currentBlocks: Block[], excludeId?: string) => {
    const occupied = new Set<string>();
    currentBlocks.forEach(b => {
      if (b.id === excludeId) return;
      for (let dx = 0; dx < b.width; dx++) {
        for (let dy = 0; dy < b.height; dy++) {
          occupied.add(`${b.x + dx},${b.y + dy}`);
        }
      }
    });
    return occupied;
  }, []);

  const moveBlock = useCallback((direction: Direction, autoId?: string) => {
    const targetId = autoId || selectedBlockId;
    if (!targetId) return;

    setBlocks(prevBlocks => {
      const blockIndex = prevBlocks.findIndex(b => b.id === targetId);
      if (blockIndex === -1) return prevBlocks;

      const block = prevBlocks[blockIndex];
      let newX = block.x;
      let newY = block.y;

      switch (direction) {
        case Direction.UP: newY -= 1; break;
        case Direction.DOWN: newY += 1; break;
        case Direction.LEFT: newX -= 1; break;
        case Direction.RIGHT: newX += 1; break;
      }

      // Check boundaries
      if (newX < 0 || newY < 0 || newX + block.width > GRID_WIDTH || newY + block.height > GRID_HEIGHT) {
        return prevBlocks;
      }

      // Check collisions
      const occupied = getOccupiedCells(prevBlocks, targetId);
      let collision = false;
      for (let dx = 0; dx < block.width; dx++) {
        for (let dy = 0; dy < block.height; dy++) {
          if (occupied.has(`${newX + dx},${newY + dy}`)) {
            collision = true;
            break;
          }
        }
      }

      if (collision) return prevBlocks;

      // Successful Move
      const newBlocks = [...prevBlocks];
      newBlocks[blockIndex] = { ...block, x: newX, y: newY };
      
      setMoves(m => m + 1);

      if (block.type === BlockType.KING && newX === WIN_COORDS.x && newY === WIN_COORDS.y) {
        setTimeout(onWin, 300);
      }

      return newBlocks;
    });
  }, [selectedBlockId, setBlocks, setMoves, getOccupiedCells, onWin]);

  // Keyboard controls
  useEffect(() => {
    if (isPlayingHint) return; // Disable keyboard during hint

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedBlockId) return;
      switch (e.key) {
        case 'ArrowUp': moveBlock(Direction.UP); break;
        case 'ArrowDown': moveBlock(Direction.DOWN); break;
        case 'ArrowLeft': moveBlock(Direction.LEFT); break;
        case 'ArrowRight': moveBlock(Direction.RIGHT); break;
        case 'w': moveBlock(Direction.UP); break;
        case 's': moveBlock(Direction.DOWN); break;
        case 'a': moveBlock(Direction.LEFT); break;
        case 'd': moveBlock(Direction.RIGHT); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBlockId, moveBlock, isPlayingHint]);

  // Solver Logic
  const handleSolve = async () => {
    if (isPlayingHint) return;
    
    setIsSolving(true);
    setHintMessage("Calculating best moves...");
    
    setTimeout(() => {
        const solution = findSolution(blocks);
        setIsSolving(false);

        if (!solution) {
            setHintMessage("No solution found from here! Try resetting.");
            setTimeout(() => setHintMessage(null), 3000);
            return;
        }

        if (solution.length === 0) {
            setHintMessage("You've already won!");
            setTimeout(() => setHintMessage(null), 3000);
            return;
        }

        const stepsToShow = hintSteps === -1 ? solution.length : Math.min(solution.length, hintSteps);
        const movesToApply = solution.slice(0, stepsToShow);
        
        setIsPlayingHint(true);
        setSelectedBlockId(null); // Deselect user selection

        let i = 0;
        const interval = setInterval(() => {
            if (i >= movesToApply.length) {
                clearInterval(interval);
                setHintMessage(null);
                setIsPlayingHint(false);
                return;
            }
            
            const move = movesToApply[i];
            
            // Directly apply move without re-checking collision (solver guarantees valid moves)
            setBlocks(currentBlocks => {
                const index = move.blockIndex;
                const block = currentBlocks[index];
                if (!block) return currentBlocks;

                let nx = block.x;
                let ny = block.y;
                if (move.direction === Direction.UP) ny--;
                else if (move.direction === Direction.DOWN) ny++;
                else if (move.direction === Direction.LEFT) nx--;
                else if (move.direction === Direction.RIGHT) nx++;
                
                const newBlocks = [...currentBlocks];
                newBlocks[index] = { ...block, x: nx, y: ny };
                
                // Highlight the block being moved by hint
                setSelectedBlockId(block.id);
                
                // Check win during hint
                if (block.type === BlockType.KING && nx === WIN_COORDS.x && ny === WIN_COORDS.y) {
                    setTimeout(onWin, 300);
                }

                return newBlocks;
            });
            
            setMoves(m => m + 1);
            i++;
        }, 250); // Fast playback

    }, 100);
  };

  const boardWidth = GRID_WIDTH * unitSize + (GRID_WIDTH - 1) * gap;
  const boardHeight = GRID_HEIGHT * unitSize + (GRID_HEIGHT - 1) * gap;

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col items-center justify-center">
      
      {/* Top Bar */}
      <div className="flex w-full max-w-md justify-between items-center mb-4 px-2">
         <div className="flex items-center gap-2 bg-white/80 rounded-xl px-3 py-2 shadow-sm border border-slate-200">
             <span className="text-xs text-slate-400 font-bold uppercase">Moves</span>
             <span className="text-xl font-bold text-slate-700 font-mono min-w-[3ch] text-center">{moves}</span>
         </div>

         <div className="flex items-center gap-2">
             <div className={`flex items-center bg-white/80 rounded-xl px-2 py-1 shadow-sm border border-slate-200 ${isPlayingHint ? 'opacity-50 pointer-events-none' : ''}`}>
                 <Settings2 size={16} className="text-slate-400 mr-2" />
                 <select 
                    value={hintSteps} 
                    onChange={(e) => setHintSteps(Number(e.target.value))}
                    className="bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer"
                 >
                     <option value={1}>1 Step</option>
                     <option value={3}>3 Steps</option>
                     <option value={5}>5 Steps</option>
                     <option value={10}>10 Steps</option>
                     <option value={-1}>Solve All</option>
                 </select>
             </div>
             
             <button 
                onClick={handleSolve}
                disabled={isSolving || isPlayingHint}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl font-bold transition-all shadow-sm ${
                    isSolving || isPlayingHint 
                    ? 'bg-amber-200 text-amber-700' 
                    : 'bg-amber-400 text-white hover:bg-amber-500 hover:-translate-y-0.5'
                }`}
             >
                {isSolving ? <span className="animate-spin">⏳</span> : <Play size={18} fill="currentColor" />}
                {isSolving ? '...' : (isPlayingHint ? 'Playing...' : 'Hint')}
             </button>
             
             <button 
                onClick={onReset}
                disabled={isPlayingHint}
                className="p-2 rounded-xl bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors shadow-sm disabled:opacity-50"
             >
                <RotateCcw size={20} />
             </button>
         </div>
      </div>

      {hintMessage && (
          <div className="absolute top-20 z-30 bg-black/75 text-white px-4 py-2 rounded-full text-sm animate-fade-in backdrop-blur-sm pointer-events-none">
              {hintMessage}
          </div>
      )}

      {/* The Board */}
      <div 
        className={`relative bg-slate-800 rounded-xl p-3 shadow-2xl border-b-8 border-slate-900 transition-all duration-300 ${isPlayingHint ? 'pointer-events-none' : ''}`}
        style={{
          width: boardWidth + 24, // + padding
          height: boardHeight + 24,
        }}
        onClick={() => !isPlayingHint && setSelectedBlockId(null)}
      >
        <div className="relative w-full h-full">
            {blocks.map(block => (
            <BlockComponent
                key={block.id}
                block={block}
                isSelected={block.id === selectedBlockId}
                onClick={setSelectedBlockId}
                unitSize={unitSize}
                gap={gap}
            />
            ))}
        </div>
        
        {/* Exit Marker */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-1/2 flex flex-col items-center opacity-40 pointer-events-none">
            <div className="text-slate-500 text-[10px] font-bold mb-0.5 tracking-[0.2em]">EXIT</div>
            <ArrowDown size={16} className="text-slate-400" />
        </div>
      </div>

      {/* Mobile Controls */}
      <div className={`mt-6 grid grid-cols-3 gap-3 ${isPlayingHint ? 'opacity-50 pointer-events-none' : ''}`}>
        <div />
        <button 
            className="w-14 h-14 flex items-center justify-center bg-white rounded-2xl shadow-sm border-b-4 border-slate-200 active:border-b-0 active:translate-y-1 active:bg-slate-50 text-slate-600 transition-all"
            onClick={(e) => { e.stopPropagation(); moveBlock(Direction.UP); }}
        >
            <ArrowUp size={24} />
        </button>
        <div />
        
        <button 
            className="w-14 h-14 flex items-center justify-center bg-white rounded-2xl shadow-sm border-b-4 border-slate-200 active:border-b-0 active:translate-y-1 active:bg-slate-50 text-slate-600 transition-all"
            onClick={(e) => { e.stopPropagation(); moveBlock(Direction.LEFT); }}
        >
            <ArrowLeft size={24} />
        </button>
        <button 
            className="w-14 h-14 flex items-center justify-center bg-white rounded-2xl shadow-sm border-b-4 border-slate-200 active:border-b-0 active:translate-y-1 active:bg-slate-50 text-slate-600 transition-all"
            onClick={(e) => { e.stopPropagation(); moveBlock(Direction.DOWN); }}
        >
            <ArrowDown size={24} />
        </button>
        <button 
            className="w-14 h-14 flex items-center justify-center bg-white rounded-2xl shadow-sm border-b-4 border-slate-200 active:border-b-0 active:translate-y-1 active:bg-slate-50 text-slate-600 transition-all"
            onClick={(e) => { e.stopPropagation(); moveBlock(Direction.RIGHT); }}
        >
            <ArrowRight size={24} />
        </button>
      </div>

    </div>
  );
};