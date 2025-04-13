import { Mesh, MeshStandardMaterial } from 'three';
import { Selectable } from '../../types/interaction';

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
