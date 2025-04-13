import { Camera, Raycaster, Scene, Vector2 } from 'three';
import { SelectionController } from '../../components/controls/SelectionController';
import { DragController } from '../../components/controls/DragController';
import { ScaleController } from '../../components/controls/ScaleController';
import { createSelectionRaycaster, normalizeCoordinates } from '../../utils/raycasting';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class InteractionManager {
  private scene: Scene;
  private camera: Camera;
  private domElement: HTMLElement;
  private controls: OrbitControls;
  private selectionController: SelectionController;
  private dragController: DragController;
  private scaleController: ScaleController;
  private raycaster: Raycaster;
  
  private lastTapTime = 0;
  private readonly doubleTapDelay = 300; // ms
  
  // Tracking for different interaction states
  private activeTouches: Map<number, Vector2> = new Map();
  private isPinching = false;
  private isMultiTouch = false;
  private lastPointerPosition = new Vector2();
  
  // Touch tracking for multi-touch gestures
  private primaryTouchId: number | null = null;
  private secondaryTouchId: number | null = null;

  constructor(scene: Scene, camera: Camera, domElement: HTMLElement, controls: OrbitControls) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;
    this.controls = controls;
    
    // Create shared raycaster
    this.raycaster = createSelectionRaycaster();
    
    this.selectionController = new SelectionController(camera, scene);
    this.dragController = new DragController(camera, scene, this.raycaster);
    this.scaleController = new ScaleController(camera, scene);
    
    // Bind event handlers
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    
    // Add event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.domElement.addEventListener('pointerdown', this.handlePointerDown);
    this.domElement.addEventListener('pointermove', this.handlePointerMove);
    this.domElement.addEventListener('pointerup', this.handlePointerUp);
    this.domElement.addEventListener('pointercancel', this.handlePointerUp);
    this.domElement.addEventListener('pointerleave', this.handlePointerUp);
  }

  private getNormalizedPointerPosition(event: PointerEvent): Vector2 {
    const { clientX, clientY } = event;
    const { width, height } = this.domElement.getBoundingClientRect();
    return normalizeCoordinates(clientX, clientY, width, height);
  }

  private handlePointerDown(event: PointerEvent): void {
    // Prevent default browser behavior
    event.preventDefault();
    
    // Store the touch position
    const position = new Vector2(event.clientX, event.clientY);
    this.activeTouches.set(event.pointerId, position);
    
    // Update multi-touch state
    this.isMultiTouch = this.activeTouches.size > 1;
    
    // If this is the first touch, store as primary
    if (this.primaryTouchId === null) {
      this.primaryTouchId = event.pointerId;
      this.lastPointerPosition.copy(position);
      this.isPinching = true;
      
      // Get normalized coordinates for selection/dragging
      const normalizedPosition = this.getNormalizedPointerPosition(event);
      const { width, height } = this.domElement.getBoundingClientRect();
      
      // Perform selection for single touch
      this.selectionController.handleTap(event.clientX, event.clientY, width, height);
      
      // Get the selected object for potential dragging
      const selectedObject = this.selectionController.getSelectedObject();
      
      // Start dragging if object is draggable
      if (selectedObject && selectedObject.userData.isDraggable && !this.isMultiTouch) {
        this.dragController.startDrag(selectedObject, normalizedPosition);
        // Disable orbit controls during drag
        this.controls.enabled = false;
      }
      
      const now = Date.now();
      this.lastTapTime = now;
    } 
    // If this is the second touch, store as secondary
    else if (this.secondaryTouchId === null) {
      this.secondaryTouchId = event.pointerId;
      
      // End any active drag operation when second touch starts
      if (this.dragController.getIsDragging()) {
        this.dragController.endDrag();
      }
      
      // Check if we have a selected object that can be scaled
      const selectedObject = this.selectionController.getSelectedObject();
      if (selectedObject && selectedObject.userData.isScalable) {
        // Get positions for both touches
        const touch1 = this.activeTouches.get(this.primaryTouchId!) || new Vector2();
        const touch2 = this.activeTouches.get(this.secondaryTouchId) || new Vector2();
        
        // Normalize positions for scaling
        const { width, height } = this.domElement.getBoundingClientRect();
        const normalizedTouch1 = normalizeCoordinates(touch1.x, touch1.y, width, height);
        const normalizedTouch2 = normalizeCoordinates(touch2.x, touch2.y, width, height);
        
        // Start scaling the selected object
        this.scaleController.startScale(selectedObject, normalizedTouch1, normalizedTouch2);
        // Disable orbit controls during scaling
        this.controls.enabled = false;
      }
    }
  }

  private handlePointerMove(event: PointerEvent): void {
    event.preventDefault();
    
    // Update the touch position
    if (this.activeTouches.has(event.pointerId)) {
      this.activeTouches.set(event.pointerId, new Vector2(event.clientX, event.clientY));
    } else {
      // If we don't have this pointer id, ignore the event
      return;
    }
    
    // Handle two-handed pinch to scale
    if (this.isMultiTouch && this.primaryTouchId !== null && this.secondaryTouchId !== null) {
      // Get current positions for both touches
      const touch1 = this.activeTouches.get(this.primaryTouchId) || new Vector2();
      const touch2 = this.activeTouches.get(this.secondaryTouchId) || new Vector2();
      
      // Normalize positions for scaling
      const { width, height } = this.domElement.getBoundingClientRect();
      const normalizedTouch1 = normalizeCoordinates(touch1.x, touch1.y, width, height);
      const normalizedTouch2 = normalizeCoordinates(touch2.x, touch2.y, width, height);
      
      // Update scaling if active
      if (this.scaleController.getIsScaling()) {
        this.scaleController.updateScale(normalizedTouch1, normalizedTouch2);
      }
    }
    // Handle single-handed drag
    else if (event.pointerId === this.primaryTouchId && this.isPinching) {
      const currentPosition = new Vector2(event.clientX, event.clientY);
      
      // Calculate movement delta
      const delta = new Vector2().subVectors(currentPosition, this.lastPointerPosition);
      
      // If we have significant movement, handle as a drag
      if (delta.length() > 2 && this.dragController.getIsDragging()) {
        const normalizedPosition = this.getNormalizedPointerPosition(event);
        this.dragController.updateDrag(normalizedPosition);
      }
      
      this.lastPointerPosition.copy(currentPosition);
    }
  }

  private handlePointerUp(event: PointerEvent): void {
    event.preventDefault();
    
    // Remove this touch from active touches
    this.activeTouches.delete(event.pointerId);
    
    // Reset interaction states based on which pointer was released
    if (event.pointerId === this.primaryTouchId) {
      this.isPinching = false;
      this.primaryTouchId = null;
      
      // End any active drag operation
      if (this.dragController.getIsDragging()) {
        this.dragController.endDrag();
      }
    } else if (event.pointerId === this.secondaryTouchId) {
      this.secondaryTouchId = null;
      
      // End any active scaling operation
      if (this.scaleController.getIsScaling()) {
        this.scaleController.endScale();
      }
    }
    
    // Update multi-touch state
    this.isMultiTouch = this.activeTouches.size > 1;
    
    // Re-enable orbit controls when all interactions end
    if (this.activeTouches.size === 0) {
      this.controls.enabled = true;
    }
  }

  /**
   * Register a callback for selection events
   */
  public onSelect(callback: (event: any) => void): void {
    this.selectionController.onSelect(callback);
  }

  /**
   * Register a callback for drag events
   */
  public onDrag(callback: (event: any) => void): void {
    this.dragController.onDrag(callback);
  }

  /**
   * Register a callback for scale events
   */
  public onScale(callback: (event: any) => void): void {
    this.scaleController.onScale(callback);
  }

  /**
   * Check if dragging is currently active
   */
  public isDragging(): boolean {
    return this.dragController.getIsDragging();
  }

  /**
   * Check if scaling is currently active
   */
  public isScaling(): boolean {
    return this.scaleController.getIsScaling();
  }

  /**
   * Clean up event listeners
   */
  public dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.domElement.removeEventListener('pointermove', this.handlePointerMove);
    this.domElement.removeEventListener('pointerup', this.handlePointerUp);
    this.domElement.removeEventListener('pointercancel', this.handlePointerUp);
    this.domElement.removeEventListener('pointerleave', this.handlePointerUp);
  }
}
