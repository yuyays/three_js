import { Object3D, Vector2, Vector3, Euler } from 'three';

export interface SelectionEvent {
  object: Object3D | null;
  point: Vector2;
  timestamp: number;
}

export interface DragEvent {
  object: Object3D | null;
  startPoint: Vector2;
  currentPoint: Vector2;
  delta: Vector2;
  timestamp: number;
}

export interface ScaleEvent {
  object: Object3D | null;
  scaleFactor: number;
  timestamp: number;
}

export interface RotationEvent {
  object: Object3D | null;
  rotationAngle: number;
  rotationAxis: Vector3;
  timestamp: number;
}

export interface Selectable {
  isSelectable: boolean;
  onSelect?: () => void;
}

export interface Draggable {
  isDraggable: boolean;
  onDragStart?: () => void;
  onDrag?: (delta: Vector2) => void;
  onDragEnd?: () => void;
}

export interface Scalable {
  isScalable: boolean;
  onScaleStart?: () => void;
  onScale?: (factor: number) => void;
  onScaleEnd?: () => void;
}

export interface Rotatable {
  isRotatable: boolean;
  onRotateStart?: () => void;
  onRotate?: (angle: number, axis: Vector3) => void;
  onRotateEnd?: () => void;
}
