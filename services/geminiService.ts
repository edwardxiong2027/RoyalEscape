import { GoogleGenAI } from "@google/genai";
import { Block, BlockType } from "../types";
import { GRID_WIDTH, GRID_HEIGHT } from "../constants";

export const getPuzzleHint = async (blocks: Block[]): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return "Please set your API Key to use the Hint feature.";
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Create a visual representation of the board for the LLM
    const grid: string[][] = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill('.'));
    
    blocks.forEach(b => {
      let char = '?';
      if (b.type === BlockType.KING) char = 'K';
      else if (b.type === BlockType.VERTICAL) char = 'V';
      else if (b.type === BlockType.HORIZONTAL) char = 'H';
      else if (b.type === BlockType.PAWN) char = 'P';
      
      for (let dy = 0; dy < b.height; dy++) {
        for (let dx = 0; dx < b.width; dx++) {
          if (b.y + dy < GRID_HEIGHT && b.x + dx < GRID_WIDTH) {
             grid[b.y + dy][b.x + dx] = char;
          }
        }
      }
    });

    const boardString = grid.map(row => row.join(' ')).join('\n');

    const prompt = `
You are an expert puzzle solver for the game Klotski (Huarong Dao).
The goal is to move the King 'K' (2x2 block) to the bottom center exit.
Current Board State (K=King, V=Vertical Block, H=Horizontal Block, P=Pawn, .=Empty):

${boardString}

Analyze the board. Provide a SINGLE, SHORT, strategic hint to the player.
Do not give the full solution. Just suggest the immediate next logical step or a general strategy for the current position.
Keep it under 30 words. Be encouraging and fun.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text?.trim() || "Hmm, I couldn't find a hint right now. Try moving the small pawns out of the way!";
  } catch (error) {
    console.error("Error fetching hint:", error);
    return "The Royal Advisor is currently unavailable (API Error).";
  }
};