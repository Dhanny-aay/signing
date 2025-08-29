"use client";
import { create } from 'zustand';
import type { ElementType } from '@/lib/types/document';

interface ToolState {
  activeTool: ElementType | null;
  setActiveTool: (tool: ElementType | null) => void;
}

export const useToolStore = create<ToolState>((set) => ({
  activeTool: null,
  setActiveTool: (tool) => set({ activeTool: tool })
}));

