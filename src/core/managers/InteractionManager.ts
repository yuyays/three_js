import { Camera, Scene, Vector2 } from 'three';
import { SelectionController } from '../../components/controls/SelectionController';

export class InteractionManager {
  private scene: Scene;
  private camera: Camera;
  private domElement: HTMLElement;
  private selectionController: SelectionController;
  private lastTapTime = 0;
  private readonly doubleTapDelay = 300; // ms

  constructor(scene: Scene, camera: Camera, domElement: HTMLElement) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;
    this.selectionController = new SelectionController(camera, scene);
    
    // Bind event handlers
    this.handlePointerEvent = this.handlePointerEvent.bind(this);
    
    // Add event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // For Vision Pro, we'll use pointer events which work with both mouse and touch
    this.domElement.addEventListener('pointerdown', this.handlePointerEvent);
  }

  private handlePointerEvent(event: PointerEvent): void {
    // Prevent default browser behavior
    event.preventDefault();
    
    const now = Date.now();
    
    // Detect tap gesture (for Vision Pro, this will be a pinch)
    if (now - this.lastTapTime < this.doubleTapDelay) {
      // This is a double tap/pinch, which we could handle differently if needed
      console.log('Double tap detected');
    } else {
      // Process single tap/pinch
      const { clientX, clientY } = event;
      const { width, height } = this.domElement.getBoundingClientRect();
      
      this.selectionController.handleTap(clientX, clientY, width, height);
    }
    
    this.lastTapTime = now;
  }

  /**
   * Register a callback for selection events
   */
  public onSelect(callback: (object: any) => void): void {
    this.selectionController.onSelect(callback);
  }

  /**
   * Clean up event listeners
   */
  public dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.handlePointerEvent);
  }
}
