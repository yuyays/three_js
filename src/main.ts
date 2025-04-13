import { PerspectiveCamera, Scene, BoxGeometry, Mesh, MeshStandardMaterial, WebGLRenderer, AmbientLight, DirectionalLight } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { InteractionManager } from './core/managers/InteractionManager';
import { makeSelectable, makeDraggable, makeScalable, makeRotatable } from './components/objects/SelectableObject'; // Import makeRotatable

// ... (scene, camera, renderer, lights setup remains the same) ...
const scene = new Scene();
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;
const renderer = new WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
const ambientLight = new AmbientLight(0xffffff, 0.5); scene.add(ambientLight);
const directionalLight = new DirectionalLight(0xffffff, 1); directionalLight.position.set(5, 5, 5); scene.add(directionalLight);

// Set up orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Create interactive objects
const createInteractiveBox = (x: number, color: number) => {
  const geometry = new BoxGeometry(1, 1, 1);
  const material = new MeshStandardMaterial({ color });
  const box = new Mesh(geometry, material);
  box.position.x = x;

  makeSelectable(box, { /* ... */ });
  makeDraggable(box, { /* ... */ });
  makeScalable(box, { /* ... */ });

  // Make the box rotatable
  makeRotatable(box, {
    onRotateStart: () => {
      console.log(`Started rotating box: ${color.toString(16)}`);
    },
    onRotate: (deltaAngle) => {
      // console.log(`Rotating box: ${color.toString(16)}, delta: ${deltaAngle.toFixed(3)} rad`);
    },
    onRotateEnd: () => {
      console.log(`Finished rotating box: ${color.toString(16)}`);
    }
  });

  scene.add(box);
  return box;
};

const redBox = createInteractiveBox(-2, 0xff0000);
const greenBox = createInteractiveBox(0, 0x00ff00);
const blueBox = createInteractiveBox(2, 0x0000ff);

// Create Interaction Manager (passing controls instance)
const interactionManager = new InteractionManager(scene, camera, renderer.domElement, controls);

// Log events (add rotation logging)
interactionManager.onSelect((event) => { console.log('Selected object:', event.object?.uuid); });
interactionManager.onDrag((event) => { /* console.log('Dragging'); */ });
interactionManager.onScale((event) => { /* console.log('Scaling'); */ });
interactionManager.onRotate((event) => { console.log('Rotating object:', event.object?.uuid, `Delta: ${event.rotationDelta.toFixed(3)}`); });


// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  // Only update controls if they are enabled
  if (controls.enabled) {
      controls.update();
  }
  renderer.render(scene, camera);
}

animate();
