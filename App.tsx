import React, { useState } from 'react';
import { GameBoard } from './components/GameBoard';
import { LEVELS } from './constants';
import { HelpCircle, Trophy, X, BarChart3 } from 'lucide-react';
import { Block } from './types';

type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

function App() {
  const [difficulty, setDifficulty] = useState<Difficulty>('HARD');
  const [blocks, setBlocks] = useState<Block[]>(LEVELS.HARD);
  const [moves, setMoves] = useState(0);
  const [showInstructions, setShowInstructions] = useState(false);
  const [hasWon, setHasWon] = useState(false);

  const resetGame = () => {
    setBlocks(LEVELS[difficulty]);
    setMoves(0);
    setHasWon(false);
  };

  const changeDifficulty = (newDiff: Difficulty) => {
    setDifficulty(newDiff);
    setBlocks(LEVELS[newDiff]);
    setMoves(0);
    setHasWon(false);
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-50 flex flex-col overflow-hidden">
      
      {/* Header - Fixed Height */}
      <div className="flex-none p-4 flex justify-between items-center bg-white border-b border-slate-200 z-20 shadow-sm gap-2">
        <div className="flex flex-col md:flex-row md:items-end gap-0 md:gap-2">
            <h1 className="text-xl md:text-3xl font-black text-slate-800 tracking-tight leading-none">
              Royal <span className="text-amber-500">Escape</span>
            </h1>
        </div>

        <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-lg px-2 py-1.5 border border-slate-200">
                <BarChart3 size={16} className="text-slate-500 mr-2 hidden sm:block" />
                <select 
                    value={difficulty}
                    onChange={(e) => changeDifficulty(e.target.value as Difficulty)}
                    className="bg-transparent text-sm font-bold text-slate-600 outline-none cursor-pointer uppercase"
                >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                </select>
            </div>

            <button 
              onClick={() => setShowInstructions(true)}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
              title="How to play"
            >
              <HelpCircle size={24} />
            </button>
        </div>
      </div>

      {/* Main Content Area - Flexible */}
      <div className="flex-1 relative w-full h-full flex items-center justify-center p-2 bg-slate-100/50">
        <GameBoard 
          key={difficulty} /* Forces full re-mount/reset when level changes */
          blocks={blocks} 
          setBlocks={setBlocks} 
          moves={moves} 
          setMoves={setMoves}
          onWin={() => setHasWon(true)}
          onReset={resetGame}
        />
      </div>

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white p-6 rounded-2xl max-w-md w-full shadow-2xl relative">
                <button 
                  onClick={() => setShowInstructions(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
                >
                  <X size={24} />
                </button>
                <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <HelpCircle className="text-amber-500" /> How to Play
                </h2>
                <ul className="space-y-4 text-slate-600 mb-8">
                    <li className="flex gap-3 items-start">
                       <span className="font-bold text-amber-500 text-lg">1.</span>
                       <span>Goal: Move the large <strong className="text-amber-600">KING</strong> to the bottom center exit.</span>
                    </li>
                    <li className="flex gap-3 items-start">
                       <span className="font-bold text-amber-500 text-lg">2.</span>
                       <span>Select <strong>Easy</strong>, <strong>Medium</strong>, or <strong>Hard</strong> from the menu.</span>
                    </li>
                    <li className="flex gap-3 items-start">
                       <span className="font-bold text-amber-500 text-lg">3.</span>
                       <span>Swipe on mobile or use arrow keys/buttons to move.</span>
                    </li>
                    <li className="flex gap-3 items-start">
                       <span className="font-bold text-amber-500 text-lg">4.</span>
                       <span>Use <strong>Hint</strong> or <strong>Undo</strong> if you get stuck!</span>
                    </li>
                </ul>
                <button 
                    onClick={() => setShowInstructions(false)}
                    className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition shadow-lg shadow-amber-500/20"
                >
                    Let's Play!
                </button>
            </div>
        </div>
      )}

      {/* Victory Modal */}
      {hasWon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
            <div className="bg-white p-8 rounded-3xl max-w-sm w-full shadow-2xl text-center transform scale-100 animate-bounce-in">
                <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trophy size={40} strokeWidth={2} />
                </div>
                <h2 className="text-3xl font-black text-slate-800 mb-2">Escaped!</h2>
                <p className="text-slate-500 mb-2">
                    Level: <strong className="text-amber-600">{difficulty}</strong>
                </p>
                <p className="text-slate-500 mb-6">
                    Moves: <strong className="text-slate-800">{moves}</strong>
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={resetGame}
                        className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 shadow-lg shadow-amber-500/30 transition transform hover:-translate-y-1"
                    >
                        Play Again
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

export default App;