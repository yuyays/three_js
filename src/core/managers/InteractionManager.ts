import { Camera, Raycaster, Scene, Vector2 } from 'three';
import { SelectionController } from '../../components/controls/SelectionController';
import { DragController } from '../../components/controls/DragController';
import { ScaleController } from '../../components/controls/ScaleController';
import { createSelectionRaycaster, normalizeCoordinates } from '../../utils/raycasting';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RotateController } from '/@/components/controls/RotationController';

export class InteractionManager {
  private scene: Scene;
  private camera: Camera;
  private domElement: HTMLElement;
  private controls: OrbitControls;
  private selectionController: SelectionController;
  private dragController: DragController;
  private scaleController: ScaleController;
  private rotateController: RotateController; // Add RotateController instance
  private raycaster: Raycaster;

  private lastTapTime = 0;
  private readonly doubleTapDelay = 300; // ms

  private activeTouches: Map<number, Vector2> = new Map();
  private isPinching = false; // Represents single touch down
  private isMultiTouch = false; // Represents two or more touches down
  private lastPointerPosition = new Vector2();

  private primaryTouchId: number | null = null;
  private secondaryTouchId: number | null = null;

  constructor(scene: Scene, camera: Camera, domElement: HTMLElement, controls: OrbitControls) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;
    this.controls = controls; // Store OrbitControls instance

    this.raycaster = createSelectionRaycaster();

    this.selectionController = new SelectionController(camera, scene);
    this.dragController = new DragController(camera, scene, this.raycaster);
    this.scaleController = new ScaleController(camera, scene);
    this.rotateController = new RotateController(camera, scene); // Instantiate RotateController

    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.domElement.addEventListener('pointerup', this.handlePointerUp);
    this.domElement.addEventListener('pointercancel', this.handlePointerUp);
    this.domElement.addEventListener('pointerleave', this.handlePointerUp); // End interaction if pointer leaves
  }

  private getNormalizedPointerPosition(clientX: number, clientY: number): Vector2 {
    const { width, height } = this.domElement.getBoundingClientRect();
    return normalizeCoordinates(clientX, clientY, width, height);
  }

  private handlePointerDown(event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.domElement.style.touchAction = 'none'; // Prevent scrolling/zooming during interaction

    const position = new Vector2(event.clientX, event.clientY);
    this.activeTouches.set(event.pointerId, position);

    const wasMultiTouch = this.isMultiTouch;
    this.isMultiTouch = this.activeTouches.size > 1;

    const selectedObject = this.selectionController.getSelectedObject();

    if (this.activeTouches.size === 1) {
        // First touch down
        this.primaryTouchId = event.pointerId;
        this.lastPointerPosition.copy(position);
        this.isPinching = true;

        const normalizedPosition = this.getNormalizedPointerPosition(event.clientX, event.clientY);

        // Perform selection only if not already dragging/scaling/rotating
        if (!this.isDragging() && !this.isScaling() && !this.isRotating()) {
             const { width, height } = this.domElement.getBoundingClientRect();
             this.selectionController.handleTap(event.clientX, event.clientY, width, height);
        }

        const newlySelectedObject = this.selectionController.getSelectedObject();
        // Start dragging only if the object is draggable and we aren't starting a multi-touch gesture
        if (newlySelectedObject && newlySelectedObject.userData.isDraggable) {
            this.dragController.startDrag(newlySelectedObject, normalizedPosition);
            this.controls.enabled = false; // Disable OrbitControls
        }

        const now = Date.now();
        this.lastTapTime = now;

    } else if (this.activeTouches.size === 2 && !wasMultiTouch) {
        // Second touch down - start multi-touch interactions (scale/rotate)
        this.secondaryTouchId = event.pointerId;

        // End single-touch drag if it was active
        if (this.dragController.getIsDragging()) {
            this.dragController.endDrag();
        }

        const currentSelectedObject = this.selectionController.getSelectedObject();
        if (currentSelectedObject) {
            const touch1 = this.activeTouches.get(this.primaryTouchId!)!;
            const touch2 = this.activeTouches.get(this.secondaryTouchId!)!;

            // Start scaling if object is scalable
            if (currentSelectedObject.userData.isScalable) {
                this.scaleController.startScale(currentSelectedObject, touch1, touch2);
                this.controls.enabled = false; // Disable OrbitControls
            }
             // Start rotating if object is rotatable
            if (currentSelectedObject.userData.isRotatable) {
                this.rotateController.startRotate(currentSelectedObject, touch1, touch2);
                this.controls.enabled = false; // Disable OrbitControls
            }
        }
    }
  }

  private handlePointerMove(event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.activeTouches.has(event.pointerId)) return; // Ignore moves from pointers not tracked

    // Update position
    const currentPosition = new Vector2(event.clientX, event.clientY);
    this.activeTouches.set(event.pointerId, currentPosition);

    if (this.isMultiTouch && this.primaryTouchId !== null && this.secondaryTouchId !== null) {
        // --- Two-touch move (Scale and Rotate) ---
        const touch1 = this.activeTouches.get(this.primaryTouchId)!;
        const touch2 = this.activeTouches.get(this.secondaryTouchId)!;

        if (this.scaleController.getIsScaling()) {
            this.scaleController.updateScale(touch1, touch2);
        }
        if (this.rotateController.getIsRotating()) {
            this.rotateController.updateRotate(touch1, touch2);
        }

    } else if (event.pointerId === this.primaryTouchId && this.isPinching && !this.isMultiTouch) {
        // --- Single-touch move (Drag) ---
        const delta = new Vector2().subVectors(currentPosition, this.lastPointerPosition);

        // Use a small threshold to differentiate tap from drag
        if (delta.length() > 2 && this.dragController.getIsDragging()) {
             const normalizedPosition = this.getNormalizedPointerPosition(event.clientX, event.clientY);
             this.dragController.updateDrag(normalizedPosition);
        }
        this.lastPointerPosition.copy(currentPosition);
    }
  }

  private handlePointerUp(event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.activeTouches.has(event.pointerId)) return; // Ignore events for pointers we aren't tracking

    // --- End corresponding interactions ---
    if (event.pointerId === this.primaryTouchId) {
        this.isPinching = false; // End single pinch state
        if (this.dragController.getIsDragging()) {
            this.dragController.endDrag();
        }
        // If secondary touch is still down, it becomes the new primary (or handle appropriately)
        // For simplicity now, we just clear primary
        this.primaryTouchId = null;
    }

    if (event.pointerId === this.secondaryTouchId) {
        // End multi-touch interactions
        if (this.scaleController.getIsScaling()) {
            this.scaleController.endScale();
        }
        if (this.rotateController.getIsRotating()) {
            this.rotateController.endRotate();
        }
        this.secondaryTouchId = null;
    }

    // Remove the pointer
    this.activeTouches.delete(event.pointerId);
    this.isMultiTouch = this.activeTouches.size > 1;

    // If primary touch was lifted but secondary remains, make secondary the new primary
    if(this.primaryTouchId === null && this.secondaryTouchId !== null && this.activeTouches.size === 1) {
        this.primaryTouchId = this.secondaryTouchId;
        this.secondaryTouchId = null;
        this.isPinching = true; // Re-enable single pinch state
        this.lastPointerPosition.copy(this.activeTouches.get(this.primaryTouchId)!);
        // Potentially start dragging again if needed, or reset state
    }


    // --- Re-enable OrbitControls ONLY if ALL interactions are finished ---
    if (this.activeTouches.size === 0) {
        this.isPinching = false;
        this.isMultiTouch = false;
        this.primaryTouchId = null;
        this.secondaryTouchId = null;
        this.controls.enabled = true; // Re-enable OrbitControls
        this.domElement.style.touchAction = 'auto'; // Restore default touch actions
    }
  }

  // ... (keep onSelect, onDrag, onScale methods) ...
  public onSelect(callback: (event: any) => void): void { /* ... */ }
  public onDrag(callback: (event: any) => void): void { /* ... */ }
  public onScale(callback: (event: any) => void): void { /* ... */ }

  /**
   * Register a callback for rotate events
   */
  public onRotate(callback: (event: any) => void): void {
    this.rotateController.onRotate(callback);
  }

  public isDragging(): boolean { return this.dragController.getIsDragging(); }
  public isScaling(): boolean { return this.scaleController.getIsScaling(); }
  public isRotating(): boolean { return this.rotateController.getIsRotating(); } // Add isRotating check

  public dispose(): void {
    // ... remove listeners ...
    this.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.domElement.removeEventListener('pointermove', this.handlePointerMove);
    this.domElement.removeEventListener('pointerup', this.handlePointerUp);
    this.domElement.removeEventListener('pointercancel', this.handlePointerUp);
    this.domElement.removeEventListener('pointerleave', this.handlePointerUp);
    this.domElement.style.touchAction = 'auto'; // Ensure touch actions are reset on dispose
  }
}
