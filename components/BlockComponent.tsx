import React from 'react';
import { Block, BlockType } from '../types';
import { Crown, Shield, Sword, User } from 'lucide-react';

interface BlockProps {
  block: Block;
  isSelected: boolean;
  onClick: (id: string) => void;
  unitSize: number;
  gap: number;
}

export const BlockComponent: React.FC<BlockProps> = ({ block, isSelected, onClick, unitSize, gap }) => {
  const getStyles = () => {
    const base = "absolute rounded-xl flex flex-col items-center justify-center shadow-lg transition-all duration-300 border-b-4 active:border-b-0 active:translate-y-1 cursor-pointer select-none";
    const selected = isSelected ? "ring-4 ring-white ring-opacity-70 scale-[1.02] z-10" : "z-0";
    
    switch (block.type) {
      case BlockType.KING:
        return `${base} ${selected} bg-amber-500 border-amber-700 text-white`;
      case BlockType.HORIZONTAL:
        return `${base} ${selected} bg-emerald-500 border-emerald-700 text-white`;
      case BlockType.VERTICAL:
        return `${base} ${selected} bg-blue-500 border-blue-700 text-white`;
      case BlockType.PAWN:
        return `${base} ${selected} bg-slate-400 border-slate-600 text-white`;
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

  const left = block.x * unitSize + block.x * gap;
  const top = block.y * unitSize + block.y * gap;
  const width = block.width * unitSize + (block.width - 1) * gap;
  const height = block.height * unitSize + (block.height - 1) * gap;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick(block.id);
      }}
      className={getStyles()}
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      {getIcon()}
      {block.type !== BlockType.PAWN && (
        <span className="text-xs font-bold mt-1 tracking-wider opacity-90 uppercase">
            {block.label}
        </span>
      )}
    </div>
  );
};