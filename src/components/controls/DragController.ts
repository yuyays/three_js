import { Camera, Object3D, Plane, Raycaster, Scene, Vector2, Vector3 } from 'three';
import { DragEvent } from '../../types/interaction';

export class DragController {
  private camera: Camera;
  private scene: Scene;
  private raycaster: Raycaster;
  private draggedObject: Object3D | null = null;
  private dragStartPoint: Vector2 = new Vector2();
  private currentDragPoint: Vector2 = new Vector2();
  private dragPlane: Plane = new Plane();
  private intersectionPoint: Vector3 = new Vector3();
  private offset: Vector3 = new Vector3();
  private onDragCallback: ((event: DragEvent) => void) | null = null;
  private isDragging: boolean = false;

  constructor(camera: Camera, scene: Scene, raycaster: Raycaster) {
    this.camera = camera;
    this.scene = scene;
    this.raycaster = raycaster;
  }

  /**
   * Start dragging an object
   */
  public startDrag(object: Object3D | null, normalizedPoint: Vector2): boolean {
    if (!object) return false;

    this.draggedObject = object;
    this.dragStartPoint.copy(normalizedPoint);
    this.currentDragPoint.copy(normalizedPoint);
    this.isDragging = true;

    // Set up the drag plane (perpendicular to camera direction, at object position)
    const objectWorldPosition = new Vector3();
    this.draggedObject.getWorldPosition(objectWorldPosition);
    
    const cameraNormal = new Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    this.dragPlane.setFromNormalAndCoplanarPoint(cameraNormal, objectWorldPosition);
    
    // Calculate the offset from the intersect point to the object position
    this.raycaster.setFromCamera(normalizedPoint, this.camera);
    if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersectionPoint)) {
      this.offset.copy(objectWorldPosition).sub(this.intersectionPoint);
    }

    // Call drag start handler if available
    if (this.draggedObject.userData.onDragStart) {
      this.draggedObject.userData.onDragStart();
    }

    return true;
  }

  /**
   * Update the drag position
   */
  public updateDrag(normalizedPoint: Vector2): boolean {
    if (!this.isDragging || !this.draggedObject) return false;

    // Store the current point
    this.currentDragPoint.copy(normalizedPoint);
    
    // Calculate the drag delta
    const delta = new Vector2().subVectors(this.currentDragPoint, this.dragStartPoint);
    
    // Update object position based on raycaster intersection with drag plane
    this.raycaster.setFromCamera(normalizedPoint, this.camera);
    if (this.raycaster.ray.intersectPlane(this.dragPlane, this.intersectionPoint)) {
      // Apply the original offset to maintain the grab point
      this.draggedObject.position.copy(this.intersectionPoint.add(this.offset));
    }

    // Call drag handler if available
    if (this.draggedObject.userData.onDrag) {
      this.draggedObject.userData.onDrag(delta);
    }

    // Trigger the drag callback
    if (this.onDragCallback) {
      this.onDragCallback({
        object: this.draggedObject,
        startPoint: this.dragStartPoint.clone(),
        currentPoint: this.currentDragPoint.clone(),
        delta: delta,
        timestamp: Date.now()
      });
    }

    return true;
  }

  /**
   * End the drag operation
   */
  public endDrag(): boolean {
    if (!this.isDragging || !this.draggedObject) return false;

    // Call drag end handler if available
    if (this.draggedObject.userData.onDragEnd) {
      this.draggedObject.userData.onDragEnd();
    }

    this.isDragging = false;
    this.draggedObject = null;
    return true;
  }

  /**
   * Set a callback function to be called during drag operations
   */
  public onDrag(callback: (event: DragEvent) => void): void {
    this.onDragCallback = callback;
  }

  /**
   * Check if currently dragging an object
   */
  public getIsDragging(): boolean {
    return this.isDragging;
  }

  /**
   * Get the current dragged object
   */
  public getDraggedObject(): Object3D | null {
    return this.draggedObject;
  }
}
