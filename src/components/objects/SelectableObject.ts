import { Mesh, MeshStandardMaterial, Vector2, Vector3 } from 'three';
import { Selectable, Draggable, Scalable, Rotatable } from '../../types/interaction';

/**
 * Make an object selectable with visual feedback
 */
export const makeSelectable = (
  mesh: Mesh,
  options: {
    highlightColor?: number;
    onSelect?: () => void;
  } = {}
): void => {
  const { highlightColor = 0x44ff44, onSelect } = options;
  
  // Store original material for resetting
  const originalMaterial = mesh.material;
  const highlightMaterial = new MeshStandardMaterial({
    color: highlightColor,
    emissive: 0x333333,
    metalness: 0.8,
    roughness: 0.2
  });

  // Add selection properties to the mesh
  mesh.userData.isSelectable = true;
  mesh.userData.originalMaterial = originalMaterial;
  mesh.userData.highlightMaterial = highlightMaterial;
  
  // Add selection handler
  mesh.userData.onSelect = () => {
    // Toggle highlight on selection
    if (mesh.material === originalMaterial) {
      mesh.material = highlightMaterial;
    } else {
      mesh.material = originalMaterial;
    }
    
    // Call custom onSelect handler if provided
    if (onSelect) {
      onSelect();
    }
  };
};

/**
 * Make an object draggable
 */
export const makeDraggable = (
  mesh: Mesh,
  options: {
    onDragStart?: () => void;
    onDrag?: (delta: Vector2) => void;
    onDragEnd?: () => void;
  } = {}
): void => {
  const { onDragStart, onDrag, onDragEnd } = options;
  
  // Add draggable properties to the mesh
  mesh.userData.isDraggable = true;
  
  // Add drag handlers
  if (onDragStart) mesh.userData.onDragStart = onDragStart;
  if (onDrag) mesh.userData.onDrag = onDrag;
  if (onDragEnd) mesh.userData.onDragEnd = onDragEnd;
};

/**
 * Make an object scalable
 */
export const makeScalable = (
  mesh: Mesh,
  options: {
    minScale?: number;
    maxScale?: number;
    onScaleStart?: () => void;
    onScale?: (factor: number) => void;
    onScaleEnd?: () => void;
  } = {}
): void => {
  const { minScale = 0.5, maxScale = 2.0, onScaleStart, onScale, onScaleEnd } = options;
  
  // Add scalable properties to the mesh
  mesh.userData.isScalable = true;
  mesh.userData.minScale = minScale;
  mesh.userData.maxScale = maxScale;
  
  // Add scale handlers
  if (onScaleStart) mesh.userData.onScaleStart = onScaleStart;
  if (onScale) mesh.userData.onScale = onScale;
  if (onScaleEnd) mesh.userData.onScaleEnd = onScaleEnd;
};

/**
 * Make an object rotatable
 */
export const makeRotatable = (
    mesh: Mesh,
    options: {
      onRotateStart?: () => void;
      onRotate?: (deltaAngle: number) => void;
      onRotateEnd?: () => void;
    } = {}
  ): void => {
    const { onRotateStart, onRotate, onRotateEnd } = options;
  
    // Add rotatable properties to the mesh
    mesh.userData.isRotatable = true;
  
    // Add rotate handlers
    if (onRotateStart) mesh.userData.onRotateStart = onRotateStart;
    if (onRotate) mesh.userData.onRotate = onRotate;
    if (onRotateEnd) mesh.userData.onRotateEnd = onRotateEnd;
  };

