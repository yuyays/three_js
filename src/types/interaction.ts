import { Object3D, Vector2 } from 'three';

export interface SelectionEvent {
  object: Object3D | null;
  point: Vector2;
  timestamp: number;
}

export interface Selectable {
  isSelectable: boolean;
  onSelect?: () => void;
}
