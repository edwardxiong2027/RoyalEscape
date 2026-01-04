import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Block, BlockType, Direction } from '../types';
import { GRID_WIDTH, GRID_HEIGHT, WIN_COORDS } from '../constants';
import { BlockComponent } from './BlockComponent';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw, Play, Settings2, Undo2, Lightbulb } from 'lucide-react';
import { findSolution } from '../services/solver';
import { audioService } from '../services/audioService';
import { getPuzzleHint } from '../services/geminiService';

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
  
  // Hint State
  const [isSolving, setIsSolving] = useState(false);
  const [isPlayingHint, setIsPlayingHint] = useState(false);
  const [hintSteps, setHintSteps] = useState(1);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const [hintData, setHintData] = useState<{blockId: string, direction: Direction} | null>(null);
  const [loadingHint, setLoadingHint] = useState(false);

  // Responsive sizing
  const containerRef = useRef<HTMLDivElement>(null);
  const [unitSize, setUnitSize] = useState(80);
  const gap = 10; 

  // Refs for access inside intervals/callbacks
  const blocksRef = useRef(blocks);
  const movesRef = useRef(moves);
  
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
            setHintData(null);
            setHintMessage(null);
        }
        return newHistory;
    });
  };

  const handleReset = () => {
    setHistory([]);
    setHintData(null);
    setHintMessage(null);
    onReset();
  };

  const moveBlock = useCallback((direction: Direction, autoId?: string) => {
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
    setHintData(null);
    if (!autoId) {
        setHintMessage(null);
    }

    // Save history BEFORE updating state
    setHistory(prev => [...prev, { blocks: currentBlocks, moves: currentMoves }]);

    setBlocks(newBlocks);
    setMoves(m => m + 1);

    if (block.type === BlockType.KING && newX === WIN_COORDS.x && newY === WIN_COORDS.y) {
      audioService.playWin();
      setTimeout(onWin, 300);
    }
  }, [selectedBlockId, setBlocks, setMoves, getOccupiedCells, onWin]);

  const handleSwipe = (id: string, direction: Direction) => {
      if (isPlayingHint) return;
      setSelectedBlockId(id);
      moveBlock(direction, id);
  };

  // Keyboard controls
  useEffect(() => {
    if (isPlayingHint) return;

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

  // Solver / Auto-Play Logic
  const handleAutoSolve = async () => {
    if (isPlayingHint || loadingHint) return;
    
    setIsSolving(true);
    setHintMessage("Calculating best moves...");
    
    setTimeout(() => {
        const solution = findSolution(blocks);
        setIsSolving(false);

        if (!solution || solution.length === 0) {
            setHintMessage(solution === null ? "No solution found!" : "Already solved!");
            setTimeout(() => setHintMessage(null), 3000);
            return;
        }

        const stepsToShow = hintSteps === -1 ? solution.length : Math.min(solution.length, hintSteps);
        const movesToApply = solution.slice(0, stepsToShow);
        
        setIsPlayingHint(true);
        setSelectedBlockId(null);
        setHintData(null); // Clear any visual arrows

        let i = 0;
        const interval = setInterval(() => {
            if (i >= movesToApply.length) {
                clearInterval(interval);
                setHintMessage(null);
                setIsPlayingHint(false);
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

  const handleGetHint = async () => {
      if (loadingHint || isPlayingHint) return;
      setLoadingHint(true);
      setHintMessage("Thinking...");

      // 1. Calculate visual next step
      setTimeout(async () => {
          const solution = findSolution(blocks);
          
          if (solution && solution.length > 0) {
              const nextMove = solution[0];
              const targetBlock = blocks[nextMove.blockIndex];
              setHintData({ blockId: targetBlock.id, direction: nextMove.direction });
          } else {
              setHintMessage(solution === null ? "Stuck? Try Resetting." : "You won!");
              setLoadingHint(false);
              return;
          }

          // 2. Fetch Text Hint
          const text = await getPuzzleHint(blocks);
          setHintMessage(text);
          setLoadingHint(false);
      }, 50);
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
                disabled={history.length === 0 || isPlayingHint}
                className="p-2 rounded-xl bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors shadow-sm disabled:opacity-50"
                title="Undo"
             >
                <Undo2 size={20} />
             </button>

             {/* Hint Button */}
             <button 
                onClick={handleGetHint}
                disabled={loadingHint || isPlayingHint}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-100 text-amber-700 font-bold hover:bg-amber-200 transition-all shadow-sm disabled:opacity-50"
                title="Get a hint"
             >
                <Lightbulb size={18} fill={hintData ? "currentColor" : "none"} />
                <span className="hidden sm:inline">Hint</span>
             </button>

             {/* Auto Solve Group */}
             <div className={`flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200 ${isPlayingHint ? 'opacity-50 pointer-events-none' : ''}`}>
                 <select 
                    value={hintSteps} 
                    onChange={(e) => setHintSteps(Number(e.target.value))}
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
                    title="Auto Play"
                 >
                    {isSolving ? <span className="animate-spin text-xs">⏳</span> : <Play size={14} fill="currentColor" />}
                 </button>
             </div>
             
             <button 
                onClick={handleReset}
                disabled={isPlayingHint}
                className="p-2 rounded-xl bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors shadow-sm disabled:opacity-50"
                title="Reset"
             >
                <RotateCcw size={20} />
             </button>
         </div>
      </div>

      {hintMessage && (
          <div className="absolute top-24 z-40 max-w-xs w-full px-4 animate-fade-in pointer-events-none">
             <div className="bg-slate-800/90 text-white px-4 py-3 rounded-2xl text-sm backdrop-blur-md shadow-xl border border-slate-700 text-center">
              {hintMessage}
             </div>
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