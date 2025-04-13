import { PerspectiveCamera, Scene, BoxGeometry, Mesh, MeshStandardMaterial, WebGLRenderer, AmbientLight, DirectionalLight } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { InteractionManager } from './core/managers/InteractionManager';
import { makeSelectable } from './components/objects/SelectableObject';

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

// Create some sample objects
const createSelectableBox = (x: number, color: number) => {
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
  
  scene.add(box);
  return box;
};

// Create multiple selectable boxes
const redBox = createSelectableBox(-2, 0xff0000);
const greenBox = createSelectableBox(0, 0x00ff00);
const blueBox = createSelectableBox(2, 0x0000ff);

// Set up orbit controls for testing in browser
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Create interaction manager for handling selection
const interactionManager = new InteractionManager(scene, camera, renderer.domElement);

// Log selected objects
interactionManager.onSelect((event) => {
  console.log('Selected object:', event.object);
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
