import { Camera, Object3D, Raycaster, Scene, Vector2 } from 'three';
import { createSelectionRaycaster, findIntersectedObjects, normalizeCoordinates } from '../../utils/raycasting';
import { SelectionEvent } from '../../types/interaction';

export class SelectionController {
  private raycaster: Raycaster;
  private camera: Camera;
  private scene: Scene;
  private selectedObject: Object3D | null = null;
  private onSelectCallback: ((event: SelectionEvent) => void) | null = null;

  constructor(camera: Camera, scene: Scene) {
    this.raycaster = createSelectionRaycaster();
    this.camera = camera;
    this.scene = scene;
  }

  /**
   * Handle tap gesture for object selection
   */
  public handleTap(x: number, y: number, width: number, height: number): void {
    const normalizedPoint = normalizeCoordinates(x, y, width, height);
    const intersects = findIntersectedObjects(this.raycaster, this.camera, this.scene, normalizedPoint);
    
    // Check if we have intersections
    if (intersects.length > 0) {
      const firstIntersect = intersects[0];
      this.selectedObject = firstIntersect.object;
      
      // Check if the object or its parent has an onSelect method
      const selectableObject = this.findSelectableParent(this.selectedObject);
      
      if (selectableObject && selectableObject.userData.onSelect) {
        selectableObject.userData.onSelect();
      }
      
      // Trigger the selection callback
      if (this.onSelectCallback) {
        this.onSelectCallback({
          object: this.selectedObject,
          point: normalizedPoint,
          timestamp: Date.now()
        });
      }
    } else {
      this.selectedObject = null;
    }
  }

  /**
   * Find the nearest parent object that has the isSelectable flag
   */
  private findSelectableParent(object: Object3D | null): Object3D | null {
    let current = object;
    
    while (current) {
      if (current.userData.isSelectable) {
        return current;
      }
      current = current.parent;
    }
    
    return null;
  }

  /**
   * Set a callback function to be called when an object is selected
   */
  public onSelect(callback: (event: SelectionEvent) => void): void {
    this.onSelectCallback = callback;
  }

  /**
   * Get the currently selected object
   */
  public getSelectedObject(): Object3D | null {
    return this.selectedObject;
  }
}
