import React, { useRef } from 'react';
import { Block, BlockType, Direction } from '../types';
import { Crown, Shield, Sword, User, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { audioService } from '../services/audioService';

interface BlockProps {
  block: Block;
  isSelected: boolean;
  hintDirection?: Direction | null;
  onClick: (id: string) => void;
  onSwipe: (id: string, direction: Direction) => void;
  unitSize: number;
  gap: number;
}

export const BlockComponent: React.FC<BlockProps> = ({ block, isSelected, hintDirection, onClick, onSwipe, unitSize, gap }) => {
  const touchStart = useRef<{x: number, y: number} | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - touchStart.current.x;
    const dy = endY - touchStart.current.y;
    
    // Threshold to distinguish tap from swipe (10px)
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        // Prevent click trigger if it was a swipe
        e.stopPropagation(); 
        
        if (Math.abs(dx) > Math.abs(dy)) {
            onSwipe(block.id, dx > 0 ? Direction.RIGHT : Direction.LEFT);
        } else {
            onSwipe(block.id, dy > 0 ? Direction.DOWN : Direction.UP);
        }
    }
    touchStart.current = null;
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSelected) {
        audioService.playSelect();
    }
    onClick(block.id);
  };

  const getStyles = () => {
    const base = "absolute rounded-xl flex flex-col items-center justify-center shadow-lg transition-all duration-300 border-b-4 active:border-b-0 active:translate-y-1 cursor-pointer select-none touch-none";
    
    // Highlighting logic
    let ring = "z-0";
    if (isSelected) {
        ring = "ring-4 ring-white ring-opacity-70 scale-[1.02] z-10";
    } else if (hintDirection) {
        // Removed scale-[1.02] to avoid transform conflict with CSS animation
        ring = "ring-4 ring-amber-400 ring-opacity-90 z-20 shadow-amber-500/50";
    }
    
    switch (block.type) {
      case BlockType.KING:
        return `${base} ${ring} bg-amber-500 border-amber-700 text-white`;
      case BlockType.HORIZONTAL:
        return `${base} ${ring} bg-emerald-500 border-emerald-700 text-white`;
      case BlockType.VERTICAL:
        return `${base} ${ring} bg-blue-500 border-blue-700 text-white`;
      case BlockType.PAWN:
        return `${base} ${ring} bg-slate-400 border-slate-600 text-white`;
      default:
        return base;
    }
  };

  const getIcon = () => {
    switch (block.type) {
      case BlockType.KING: return <Crown size={48} strokeWidth={1.5} />;
      case BlockType.HORIZONTAL: return <Sword size={32} className="rotate-90" strokeWidth={1.5} />;
      case BlockType.VERTICAL: return <Shield size={32} strokeWidth={1.5} />;
      case BlockType.PAWN: return <User size={24} strokeWidth={1.5} />;
    }
  };

  const renderHintArrow = () => {
      if (!hintDirection) return null;
      
      const arrowProps = { size: 40, className: "text-white drop-shadow-lg filter drop-shadow-black animate-pulse", strokeWidth: 3 };
      
      return (
          <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none bg-black/20 rounded-xl">
             {hintDirection === Direction.UP && <ArrowUp {...arrowProps} className="animate-bounce mb-4" />}
             {hintDirection === Direction.DOWN && <ArrowDown {...arrowProps} className="animate-bounce mt-4" />}
             {hintDirection === Direction.LEFT && <ArrowLeft {...arrowProps} className="animate-pulse mr-4" />}
             {hintDirection === Direction.RIGHT && <ArrowRight {...arrowProps} className="animate-pulse ml-4" />}
          </div>
      );
  };

  const getAnimation = () => {
    if (!hintDirection) return {};
    switch (hintDirection) {
        case Direction.UP: return { animation: 'hint-up 1.5s ease-in-out infinite' };
        case Direction.DOWN: return { animation: 'hint-down 1.5s ease-in-out infinite' };
        case Direction.LEFT: return { animation: 'hint-left 1.5s ease-in-out infinite' };
        case Direction.RIGHT: return { animation: 'hint-right 1.5s ease-in-out infinite' };
        default: return {};
    }
  };

  const left = block.x * unitSize + block.x * gap;
  const top = block.y * unitSize + block.y * gap;
  const width = block.width * unitSize + (block.width - 1) * gap;
  const height = block.height * unitSize + (block.height - 1) * gap;

  return (
    <div
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={getStyles()}
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        ...getAnimation()
      }}
    >
      {getIcon()}
      {block.type !== BlockType.PAWN && (
        <span className="text-xs font-bold mt-1 tracking-wider opacity-90 uppercase">
            {block.label}
        </span>
      )}
      {renderHintArrow()}
    </div>
  );
};