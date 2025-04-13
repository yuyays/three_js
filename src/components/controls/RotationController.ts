import { Camera, Object3D, Scene, Vector2 } from 'three';
import { RotateEvent } from '../../types/interaction';

export class RotateController {
  private camera: Camera;
  private scene: Scene;
  private rotateObject: Object3D | null = null;
  private initialAngle: number = 0;
  private previousAngle: number = 0;
  private totalRotation: number = 0; // Track total rotation within one gesture
  private onRotateCallback: ((event: RotateEvent) => void) | null = null;
  private isRotating: boolean = false;

  constructor(camera: Camera, scene: Scene) {
    this.camera = camera;
    this.scene = scene;
  }

  /**
   * Start rotating an object
   */
  public startRotate(object: Object3D | null, touch1: Vector2, touch2: Vector2): boolean {
    if (!object) return false;

    this.rotateObject = object;
    this.isRotating = true;
    this.totalRotation = 0; // Reset total rotation for the new gesture

    // Calculate initial angle between touches relative to the x-axis
    this.initialAngle = this.getAngle(touch1, touch2);
    this.previousAngle = this.initialAngle;

    // Call rotate start handler if available
    if (this.rotateObject.userData.onRotateStart) {
      this.rotateObject.userData.onRotateStart();
    }

    return true;
  }

  /**
   * Update the rotation based on current touch positions
   */
  public updateRotate(touch1: Vector2, touch2: Vector2): boolean {
    if (!this.isRotating || !this.rotateObject) return false;

    // Calculate current angle between touches
    const currentAngle = this.getAngle(touch1, touch2);

    // Calculate the change in angle since the last frame
    let rotationDelta = currentAngle - this.previousAngle;

    // Handle angle wrap-around (e.g., from 359 degrees to 1 degree)
    if (rotationDelta > Math.PI) {
        rotationDelta -= 2 * Math.PI;
    } else if (rotationDelta < -Math.PI) {
        rotationDelta += 2 * Math.PI;
    }

    // Apply rotation around the object's Z-axis (perpendicular to the screen)
    // Note: You might want rotation around Y axis depending on object orientation and desired behavior
    this.rotateObject.rotateZ(rotationDelta);

    // Update total rotation and previous angle
    this.totalRotation += rotationDelta;
    this.previousAngle = currentAngle;

    // Call rotate handler if available
    if (this.rotateObject.userData.onRotate) {
      this.rotateObject.userData.onRotate(rotationDelta);
    }

    // Trigger the rotate callback
    if (this.onRotateCallback) {
      this.onRotateCallback({
        object: this.rotateObject,
        rotationDelta: rotationDelta,
        totalRotation: this.totalRotation,
        timestamp: Date.now()
      });
    }

    return true;
  }

  /**
   * End the rotation operation
   */
  public endRotate(): boolean {
    if (!this.isRotating || !this.rotateObject) return false;

    // Call rotate end handler if available
    if (this.rotateObject.userData.onRotateEnd) {
      this.rotateObject.userData.onRotateEnd();
    }

    this.isRotating = false;
    this.rotateObject = null;
    return true;
  }

  /**
   * Calculate the angle between two points relative to the positive x-axis
   */
  private getAngle(point1: Vector2, point2: Vector2): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.atan2(dy, dx);
  }

  /**
   * Set a callback function to be called during rotate operations
   */
  public onRotate(callback: (event: RotateEvent) => void): void {
    this.onRotateCallback = callback;
  }

  /**
   * Check if currently rotating an object
   */
  public getIsRotating(): boolean {
    return this.isRotating;
  }

  /**
   * Get the current rotated object
   */
  public getRotatedObject(): Object3D | null {
    return this.rotateObject;
  }
}
