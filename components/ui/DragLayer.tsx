"use client";
import { DragOverlay } from '@dnd-kit/core';
import { ReactNode } from 'react';

export default function DragLayer({ children }: { children?: ReactNode }) {
  return (
    <DragOverlay dropAnimation={null}>
      {children}
    </DragOverlay>
  );
}

