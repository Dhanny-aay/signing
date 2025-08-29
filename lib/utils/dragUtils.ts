import type { ElementType, SigningElement } from '@/lib/types/document';

// x,y,size are stored in page-space units (independent of zoom)
export function newElement(type: ElementType, page: number, x: number, y: number, zoom = 1): SigningElement {
  const base = {
    id: `el_${Math.random().toString(36).slice(2, 9)}`,
    type,
    position: { x, y },
    page,
  } as const;

  switch (type) {
    case 'text':
      return { ...base, size: { width: 160 / zoom, height: 32 / zoom }, properties: { text: 'Text', fontSize: 14, color: '#111827' } };
    case 'signature':
      return { ...base, size: { width: 240 / zoom, height: 80 / zoom }, properties: { strokes: [] } };
    case 'date':
      return { ...base, size: { width: 140 / zoom, height: 28 / zoom }, properties: { format: 'YYYY-MM-DD' } };
    case 'checkbox':
      return { ...base, size: { width: 24 / zoom, height: 24 / zoom }, properties: { checked: false, label: '' } };
    case 'stamp':
      return { ...base, size: { width: 160 / zoom, height: 56 / zoom }, properties: { text: 'APPROVED' } };
    case 'initials':
      return { ...base, size: { width: 80 / zoom, height: 40 / zoom }, properties: { value: '' } };
    case 'radio':
      return { ...base, size: { width: 24 / zoom, height: 24 / zoom }, properties: { selected: false, name: 'group' } };
    default:
      return { ...base, size: { width: 120 / zoom, height: 32 / zoom }, properties: {} } as SigningElement;
  }
}
