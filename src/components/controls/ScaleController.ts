import { Camera, Object3D, Scene, Vector2, Vector3 } from 'three';
import { ScaleEvent } from '../../types/interaction';

export class ScaleController {
  private camera: Camera;
  private scene: Scene;
  private scaleObject: Object3D | null = null;
  private initialDistance: number = 0;
  private onScaleCallback: ((event: ScaleEvent) => void) | null = null;
  private isScaling: boolean = false;
  private initialScale: Vector3 = new Vector3();

  constructor(camera: Camera, scene: Scene) {
    this.camera = camera;
    this.scene = scene;
  }

  /**
   * Start scaling an object
   */
  public startScale(object: Object3D | null, touch1: Vector2, touch2: Vector2): boolean {
    if (!object) return false;

    this.scaleObject = object;
    this.isScaling = true;
    
    // Calculate initial distance between touches
    this.initialDistance = this.getDistance(touch1, touch2);
    
    // Store the initial scale
    this.initialScale.copy(this.scaleObject.scale);
    
    // Call scale start handler if available
    if (this.scaleObject.userData.onScaleStart) {
      this.scaleObject.userData.onScaleStart();
    }

    return true;
  }

  /**
   * Update the scaling based on current touch positions
   */
  public updateScale(touch1: Vector2, touch2: Vector2): boolean {
    if (!this.isScaling || !this.scaleObject) return false;
    
    // Calculate current distance between touches
    const currentDistance = this.getDistance(touch1, touch2);
    
    // Calculate scale factor
    const scaleFactor = currentDistance / this.initialDistance;
    
    // Apply scale within min/max bounds
    const newScale = this.initialScale.clone().multiplyScalar(scaleFactor);
    
    // Apply min/max scale if defined
    if (this.scaleObject.userData.minScale !== undefined && 
        this.scaleObject.userData.maxScale !== undefined) {
      const minScale = this.scaleObject.userData.minScale;
      const maxScale = this.scaleObject.userData.maxScale;
      
      newScale.x = Math.max(this.initialScale.x * minScale, Math.min(this.initialScale.x * maxScale, newScale.x));
      newScale.y = Math.max(this.initialScale.y * minScale, Math.min(this.initialScale.y * maxScale, newScale.y));
      newScale.z = Math.max(this.initialScale.z * minScale, Math.min(this.initialScale.z * maxScale, newScale.z));
    }
    
    // Apply the calculated scale
    this.scaleObject.scale.copy(newScale);
    
    // Call scale handler if available
    if (this.scaleObject.userData.onScale) {
      this.scaleObject.userData.onScale(scaleFactor);
    }

    // Trigger the scale callback
    if (this.onScaleCallback) {
      this.onScaleCallback({
        object: this.scaleObject,
        scaleFactor: scaleFactor,
        timestamp: Date.now()
      });
    }

    return true;
  }

  /**
   * End the scaling operation
   */
  public endScale(): boolean {
    if (!this.isScaling || !this.scaleObject) return false;

    // Call scale end handler if available
    if (this.scaleObject.userData.onScaleEnd) {
      this.scaleObject.userData.onScaleEnd();
    }

    this.isScaling = false;
    this.scaleObject = null;
    return true;
  }

  /**
   * Calculate distance between two points
   */
  private getDistance(point1: Vector2, point2: Vector2): number {
    return point1.distanceTo(point2);
  }

  /**
   * Set a callback function to be called during scale operations
   */
  public onScale(callback: (event: ScaleEvent) => void): void {
    this.onScaleCallback = callback;
  }

  /**
   * Check if currently scaling an object
   */
  public getIsScaling(): boolean {
    return this.isScaling;
  }

  /**
   * Get the current scaled object
   */
  public getScaledObject(): Object3D | null {
    return this.scaleObject;
  }
}
