import { PerspectiveCamera, Scene, BoxGeometry, Mesh, MeshStandardMaterial, WebGLRenderer, AmbientLight, DirectionalLight } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { InteractionManager } from './core/managers/InteractionManager';
import { makeSelectable, makeDraggable, makeScalable } from './components/objects/SelectableObject';

// Create a scene
const scene = new Scene();

// Create a camera
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// Create a renderer
const renderer = new WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Add lights
const ambientLight = new AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Set up orbit controls for testing in browser
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Create some sample objects
const createInteractiveBox = (x: number, color: number) => {
  const geometry = new BoxGeometry(1, 1, 1);
  const material = new MeshStandardMaterial({ color });
  const box = new Mesh(geometry, material);
  box.position.x = x;
  
  // Make the box selectable
  makeSelectable(box, {
    onSelect: () => {
      console.log(`Box selected: ${color.toString(16)}`);
    }
  });
  
  // Make the box draggable
  makeDraggable(box, {
    onDragStart: () => {
      console.log(`Started dragging box: ${color.toString(16)}`);
    },
    onDrag: (delta) => {
      // Additional custom drag behavior could be added here
    },
    onDragEnd: () => {
      console.log(`Finished dragging box: ${color.toString(16)}`);
    }
  });
  
  // Make the box scalable
  makeScalable(box, {
    minScale: 0.5,
    maxScale: 3.0,
    onScaleStart: () => {
      console.log(`Started scaling box: ${color.toString(16)}`);
    },
    onScale: (factor) => {
      console.log(`Scaling box: ${color.toString(16)}, factor: ${factor.toFixed(2)}`);
    },
    onScaleEnd: () => {
      console.log(`Finished scaling box: ${color.toString(16)}`);
    }
  });
  
  scene.add(box);
  return box;
};

// Create multiple interactive boxes
const redBox = createInteractiveBox(-2, 0xff0000);
const greenBox = createInteractiveBox(0, 0x00ff00);
const blueBox = createInteractiveBox(2, 0x0000ff);

// Create interaction manager for handling selection, dragging, and scaling
const interactionManager = new InteractionManager(scene, camera, renderer.domElement, controls);

// Log selected objects
interactionManager.onSelect((event) => {
  console.log('Selected object:', event.object);
});

// Log drag events
interactionManager.onDrag((event) => {
  console.log('Dragging object:', event.object, 'Delta:', event.delta);
});

// Log scale events
interactionManager.onScale((event) => {
  console.log('Scaling object:', event.object, 'Scale factor:', event.scaleFactor.toFixed(2));
});

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

animate();
