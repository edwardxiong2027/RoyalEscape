import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Block, BlockType, Direction } from '../types';
import { GRID_WIDTH, GRID_HEIGHT, WIN_COORDS } from '../constants';
import { BlockComponent } from './BlockComponent';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw, Play, Undo2, Lightbulb } from 'lucide-react';
import { findSolution } from '../services/solver';
import { audioService } from '../services/audioService';


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
  const [history, setHistory] = useState<{blocks: Block[], moves: number}[]>([]);
  
  // Auto-solve (computer move) state
  const [isSolving, setIsSolving] = useState(false);
  const [isPlayingAuto, setIsPlayingAuto] = useState(false);
  const [autoSteps, setAutoSteps] = useState(1);
  const [autoMessage, setAutoMessage] = useState<string | null>(null);
  const [isPlayingHint, setIsPlayingHint] = useState(false);
  const [hintData, setHintData] = useState<{ blockId: string; direction: Direction; message: string } | null>(null);

  // Responsive sizing
  const containerRef = useRef<HTMLDivElement>(null);
  const [unitSize, setUnitSize] = useState(80);
  const gap = 10; 

  // Refs for access inside intervals/callbacks
  const blocksRef = useRef(blocks);
  const movesRef = useRef(moves);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    blocksRef.current = blocks;
    movesRef.current = moves;
  }, [blocks, moves]);

  // Resize Observer
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      
      const padding = 32; 
      const controlsHeight = 160; 
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

  const clearHintTimeout = useCallback(() => {
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current);
      hintTimeoutRef.current = null;
    }
  }, []);

  const clearHint = useCallback(() => {
    clearHintTimeout();
    setHintData(null);
    setIsPlayingHint(false);
  }, [clearHintTimeout]);

  useEffect(() => {
    return () => clearHintTimeout();
  }, [clearHintTimeout]);

  const directionToText = useCallback((dir: Direction) => {
    switch (dir) {
      case Direction.UP: return 'up';
      case Direction.DOWN: return 'down';
      case Direction.LEFT: return 'left';
      case Direction.RIGHT: return 'right';
      default: return '';
    }
  }, []);

  const handleUndo = () => {
    setHistory(prev => {
        if (prev.length === 0) return prev;
        const newHistory = [...prev];
        const lastState = newHistory.pop();
        if (lastState) {
            audioService.playUndo();
            setBlocks(lastState.blocks);
            setMoves(lastState.moves);
            
            // Clear hints on undo
            setAutoMessage(null);
            clearHint();
        }
        return newHistory;
    });
  };

  const handleReset = () => {
    setHistory([]);
    setAutoMessage(null);
    clearHint();
    onReset();
  };

  const moveBlock = useCallback((direction: Direction, autoId?: string) => {
    if (isPlayingAuto) return;
    if (isPlayingHint) {
      clearHint();
    }

    const targetId = autoId || selectedBlockId;
    if (!targetId) return;

    const currentBlocks = blocksRef.current;
    const currentMoves = movesRef.current;

    const blockIndex = currentBlocks.findIndex(b => b.id === targetId);
    if (blockIndex === -1) return;

    const block = currentBlocks[blockIndex];
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
      return;
    }

    // Check collisions
    const occupied = getOccupiedCells(currentBlocks, targetId);
    let collision = false;
    for (let dx = 0; dx < block.width; dx++) {
      for (let dy = 0; dy < block.height; dy++) {
        if (occupied.has(`${newX + dx},${newY + dy}`)) {
          collision = true;
          break;
        }
      }
    }

    if (collision) return;

    // Successful Move
    const newBlocks = [...currentBlocks];
    newBlocks[blockIndex] = { ...block, x: newX, y: newY };
    
    // Play sound
    audioService.playMove();

    // Clear Hint if player moves
    setAutoMessage(null);

    // Save history BEFORE updating state
    setHistory(prev => [...prev, { blocks: currentBlocks, moves: currentMoves }]);

    setBlocks(newBlocks);
    setMoves(m => m + 1);

    if (block.type === BlockType.KING && newX === WIN_COORDS.x && newY === WIN_COORDS.y) {
      audioService.playWin();
      setTimeout(onWin, 300);
    }
  }, [selectedBlockId, setBlocks, setMoves, getOccupiedCells, onWin, isPlayingAuto, isPlayingHint, clearHint]);

  const handleSwipe = (id: string, direction: Direction) => {
      if (isPlayingAuto) return;
      setSelectedBlockId(id);
      clearHint();
      moveBlock(direction, id);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedBlockId || isPlayingAuto) return;
      if (isPlayingHint) {
        clearHint();
      }
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
  }, [selectedBlockId, moveBlock, isPlayingAuto, isPlayingHint, clearHint]);

  const handleGetHint = useCallback(() => {
    if (isSolving || isPlayingAuto) return;
    clearHintTimeout();
    setIsPlayingHint(true);
    setAutoMessage("Finding a smart hint...");

    const solution = findSolution(blocks);
    if (!solution || solution.length === 0) {
      const message = solution === null ? "No hint available for this layout." : "Already solved!";
      setAutoMessage(message);
      hintTimeoutRef.current = window.setTimeout(() => {
        setAutoMessage(null);
        setIsPlayingHint(false);
      }, 2500);
      return;
    }

    const nextMove = solution[0];
    const block = blocks[nextMove.blockIndex];
    if (!block) {
      setAutoMessage("No hint available right now.");
      hintTimeoutRef.current = window.setTimeout(() => {
        setAutoMessage(null);
        setIsPlayingHint(false);
      }, 2000);
      return;
    }

    const directionLabel = directionToText(nextMove.direction);
    const message = `Try moving ${block.label || 'that block'} ${directionLabel}.`;

    setHintData({ blockId: block.id, direction: nextMove.direction, message });
    setSelectedBlockId(block.id);
    setAutoMessage(message);

    hintTimeoutRef.current = window.setTimeout(() => {
      setHintData(null);
      setAutoMessage(null);
      setIsPlayingHint(false);
    }, 4000);
  }, [blocks, isPlayingAuto, isSolving, clearHintTimeout, directionToText]);

  // Auto-solve (computer move) logic
  const handleAutoSolve = async () => {
    if (isPlayingAuto) return;
    clearHint();
    setIsSolving(true);
    setAutoMessage("Computer is moving...");
    setTimeout(() => {
      const solution = findSolution(blocks);
      setIsSolving(false);
      if (!solution || solution.length === 0) {
        setAutoMessage(solution === null ? "No solution found!" : "Already solved!");
        setTimeout(() => setAutoMessage(null), 3000);
        return;
      }
      const stepsToShow = autoSteps === -1 ? solution.length : Math.min(solution.length, autoSteps);
      const movesToApply = solution.slice(0, stepsToShow);
      setIsPlayingAuto(true);
      setSelectedBlockId(null);
      let i = 0;
      const interval = setInterval(() => {
        if (i >= movesToApply.length) {
          clearInterval(interval);
          setAutoMessage(null);
          setIsPlayingAuto(false);
          return;
        }
        const move = movesToApply[i];
        const currentBlocks = blocksRef.current;
        const currentMoves = movesRef.current;
        const index = move.blockIndex;
        const block = currentBlocks[index];
        if (block) {
          let nx = block.x;
          let ny = block.y;
          if (move.direction === Direction.UP) ny--;
          else if (move.direction === Direction.DOWN) ny++;
          else if (move.direction === Direction.LEFT) nx--;
          else if (move.direction === Direction.RIGHT) nx++;
          const newBlocks = [...currentBlocks];
          newBlocks[index] = { ...block, x: nx, y: ny };
          audioService.playMove();
          setHistory(prev => [...prev, { blocks: currentBlocks, moves: currentMoves }]);
          setBlocks(newBlocks);
          setMoves(m => m + 1);
          setSelectedBlockId(block.id);
          if (block.type === BlockType.KING && nx === WIN_COORDS.x && ny === WIN_COORDS.y) {
            audioService.playWin();
            setTimeout(onWin, 300);
          }
        }
        i++;
      }, 250);
    }, 100);
  };

  const boardWidth = GRID_WIDTH * unitSize + (GRID_WIDTH - 1) * gap;
  const boardHeight = GRID_HEIGHT * unitSize + (GRID_HEIGHT - 1) * gap;

  // For keyboard focus management
  const blockRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Focus the selected block when selectedBlockId changes
  useEffect(() => {
    if (selectedBlockId && blockRefs.current) {
      const idx = blocks.findIndex(b => b.id === selectedBlockId);
      if (idx !== -1 && blockRefs.current[idx]) {
        blockRefs.current[idx]?.focus();
      }
    }
  }, [selectedBlockId, blocks]);

  // Handle Tab/Shift+Tab navigation
  const handleBlockKeyDown = (e: React.KeyboardEvent<HTMLDivElement>, idx: number) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      let nextIdx;
      if (e.shiftKey) {
        nextIdx = (idx - 1 + blocks.length) % blocks.length;
      } else {
        nextIdx = (idx + 1) % blocks.length;
      }
      setSelectedBlockId(blocks[nextIdx].id);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col items-center justify-center">
      
      {/* Top Bar */}
      <div className="flex w-full max-w-lg justify-between items-center mb-4 px-2 gap-2">
         <div className="flex items-center gap-2 bg-white/80 rounded-xl px-3 py-2 shadow-sm border border-slate-200">
             <span className="text-xs text-slate-400 font-bold uppercase">Moves</span>
             <span className="text-xl font-bold text-slate-700 font-mono min-w-[3ch] text-center">{moves}</span>
         </div>

         <div className="flex items-center gap-2 flex-wrap justify-end">
             <button 
                onClick={handleUndo}
                disabled={history.length === 0}
                className="p-2 rounded-xl bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors shadow-sm disabled:opacity-50"
                title="Undo"
             >
                <Undo2 size={20} />
             </button>

             {/* Hint Button */}
             <button 
                onClick={handleGetHint}
                disabled={isSolving || isPlayingAuto || isPlayingHint}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-100 text-amber-700 font-bold hover:bg-amber-200 transition-all shadow-sm disabled:opacity-50"
                title="Get a hint"
             >
                <Lightbulb size={18} fill={hintData ? "currentColor" : "none"} />
                <span className="hidden sm:inline">Hint</span>
             </button>

             {/* Computer Move (Auto-Solve) Group */}
             <div className={`flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 ${isPlayingAuto ? 'opacity-50 pointer-events-none' : ''}`}>
                <select 
                  value={autoSteps} 
                  onChange={(e) => setAutoSteps(Number(e.target.value))}
                  className="bg-transparent text-xs font-bold text-slate-500 outline-none cursor-pointer px-1"
                >
                  <option value={1}>1 Step</option>
                  <option value={5}>5 Steps</option>
                  <option value={-1}>All</option>
                </select>
                <button 
                  onClick={handleAutoSolve}
                  disabled={isSolving}
                  className="ml-1 p-1.5 rounded-lg bg-white text-slate-600 shadow-sm hover:text-amber-500 transition-colors"
                  title="Let Computer Move"
                >
                  {isSolving ? <span className="animate-spin text-xs">⏳</span> : <Play size={14} fill="currentColor" />}
                </button>
             </div>
             
             <button 
                onClick={handleReset}
                disabled={false}
                className="p-2 rounded-xl bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors shadow-sm disabled:opacity-50"
                title="Reset"
             >
                <RotateCcw size={20} />
             </button>
         </div>
      </div>

        {autoMessage && (
          <div className="absolute top-24 z-40 max-w-xs w-full px-4 animate-fade-in pointer-events-none">
           <div className="bg-slate-800/90 text-white px-4 py-3 rounded-2xl text-sm backdrop-blur-md shadow-xl border border-slate-700 text-center">
            {autoMessage}
           </div>
          </div>
        )}

      {/* The Board */}
      <div 
        className="relative bg-slate-800 rounded-xl p-3 shadow-2xl border-b-8 border-slate-900 transition-all duration-300"
        style={{
          width: boardWidth + 24, // + padding
          height: boardHeight + 24,
        }}
        onClick={() => setSelectedBlockId(null)}
      >
        <div className="relative w-full h-full">
            {blocks.map((block, idx) => (
              <BlockComponent
                key={block.id}
                block={block}
                isSelected={block.id === selectedBlockId}
                hintDirection={hintData?.blockId === block.id ? hintData.direction : null}
                onClick={setSelectedBlockId}
                onSwipe={handleSwipe}
                unitSize={unitSize}
                gap={gap}
                tabIndex={0}
                ref={el => blockRefs.current[idx] = el}
                onKeyDown={e => handleBlockKeyDown(e, idx)}
                onFocus={() => setSelectedBlockId(block.id)}
              />
            ))}
        </div>
        
        {/* Exit Marker */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-1/2 flex flex-col items-center opacity-40 pointer-events-none">
            <div className="text-slate-500 text-[10px] font-bold mb-0.5 tracking-[0.2em]">EXIT</div>
            <ArrowDown size={16} className="text-slate-400" />
        </div>
      </div>

      {/* Mobile Controls: Only show on touch devices */}
      <div
        className="mt-6 grid grid-cols-3 gap-3"
        style={{ display: 'none' }}
        id="mobile-controls"
      >
        <div />
        <button
          className="w-14 h-14 flex items-center justify-center bg-white rounded-2xl shadow-sm border-b-4 border-slate-200 active:border-b-0 active:translate-y-1 active:bg-slate-50 text-slate-600 transition-all"
          onClick={e => { e.stopPropagation(); moveBlock(Direction.UP); }}
        >
          <ArrowUp size={24} />
        </button>
        <div />
        <button
          className="w-14 h-14 flex items-center justify-center bg-white rounded-2xl shadow-sm border-b-4 border-slate-200 active:border-b-0 active:translate-y-1 active:bg-slate-50 text-slate-600 transition-all"
          onClick={e => { e.stopPropagation(); moveBlock(Direction.LEFT); }}
        >
          <ArrowLeft size={24} />
        </button>
        <button
          className="w-14 h-14 flex items-center justify-center bg-white rounded-2xl shadow-sm border-b-4 border-slate-200 active:border-b-0 active:translate-y-1 active:bg-slate-50 text-slate-600 transition-all"
          onClick={e => { e.stopPropagation(); moveBlock(Direction.DOWN); }}
        >
          <ArrowDown size={24} />
        </button>
        <button
          className="w-14 h-14 flex items-center justify-center bg-white rounded-2xl shadow-sm border-b-4 border-slate-200 active:border-b-0 active:translate-y-1 active:bg-slate-50 text-slate-600 transition-all"
          onClick={e => { e.stopPropagation(); moveBlock(Direction.RIGHT); }}
        >
          <ArrowRight size={24} />
        </button>
      </div>

      {/* Show mobile controls only on touch devices */}
      <script dangerouslySetInnerHTML={{
        __html: `
          if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            document.getElementById('mobile-controls').style.display = 'grid';
          }
        `
      }} />

    </div>
  );
};
