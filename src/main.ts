import * as THREE from 'three';
import { 
  PerspectiveCamera, Scene, BoxGeometry, SphereGeometry, CylinderGeometry,
  ConeGeometry, TorusGeometry, TetrahedronGeometry, Mesh, MeshStandardMaterial, 
  WebGLRenderer, AmbientLight, DirectionalLight, Vector3, Color, Texture,
  TextureLoader as ThreeTextureLoader, RepeatWrapping, HemisphereLight, PointLight,
  MeshBasicMaterial, PlaneGeometry, GridHelper
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { InteractionManager } from './core/managers/InteractionManager';
import { makeSelectable, makeDraggable, makeScalable, makeRotatable } from './components/objects/SelectableObject';

// Define shape types for better typing
type ShapeType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'tetrahedron';

// Set up proper touch handling for WebXR
function setupXRTouchHandling() {
  // Apply CSS touch handling
  document.documentElement.style.touchAction = 'none';
  document.body.style.touchAction = 'none';
  
  // Create a style element for additional rules
  const style = document.createElement('style');
  style.textContent = `
    * {
      touch-action: none;
      -webkit-touch-callout: none;
      -webkit-tap-highlight-color: rgba(0,0,0,0);
    }

    #ui-controls {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      align-items: center;
      pointer-events: auto;
    }
    
    #shape-controls {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
      margin-top: 10px;
    }
    
    .shape-btn {
      background-color: rgba(60, 60, 60, 0.7);
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.5);
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 14px;
      cursor: pointer;
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
      transition: all 0.2s ease;
      min-width: 70px;
      min-height: 40px;
    }
    
    .shape-btn:hover {
      background-color: rgba(80, 80, 80, 0.8);
      transform: scale(1.05);
    }
    
    /* Color each button based on shape type */
    [data-shape="box"] { border-color: rgba(255, 100, 100, 0.7); }
    [data-shape="sphere"] { border-color: rgba(100, 255, 100, 0.7); }
    [data-shape="cylinder"] { border-color: rgba(100, 100, 255, 0.7); }
    [data-shape="cone"] { border-color: rgba(255, 100, 255, 0.7); }
    [data-shape="torus"] { border-color: rgba(255, 255, 100, 0.7); }
    [data-shape="tetrahedron"] { border-color: rgba(100, 255, 255, 0.7); }
  `;
  document.head.appendChild(style);
  
  // Create UI controls container if it doesn't exist
  if (!document.getElementById('ui-controls')) {
    const uiControls = document.createElement('div');
    uiControls.id = 'ui-controls';
    document.body.appendChild(uiControls);
  }
  
  // Prevent default on touch events at document level
  const preventDefault = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  document.addEventListener('touchstart', preventDefault, { passive: false, capture: true });
  document.addEventListener('touchmove', preventDefault, { passive: false, capture: true });
  document.addEventListener('touchend', preventDefault, { passive: false, capture: true });
}

// Call the setup function
setupXRTouchHandling();

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

// Lighting System
const lighting = {
  // Lights
  ambientLight: new AmbientLight(0xffffff, 0.5),
  directionalLight: new DirectionalLight(0xffffff, 1.5), // Increased intensity
  hemisphereLight: new HemisphereLight(0xffffbb, 0x080820, 0.7), // Increased intensity
  pointLights: [] as PointLight[],
  
  // Ambient Occlusion
  useAO: true,
  aoIntensity: 0.3,
  
  // Day/night cycle
  isDay: true,
  dayIntensity: 1.0,
  nightIntensity: 0.2,
  transitionSpeed: 0.002,
  currentIntensity: 1.0,
  targetIntensity: 1.0,
  
  // Initialize lighting
  init: function() {
    // Configure directional light with better shadow settings
    this.directionalLight.position.set(5, 15, 10);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 4096; // Higher resolution shadow map
    this.directionalLight.shadow.mapSize.height = 4096;
    this.directionalLight.shadow.camera.near = 0.1;
    this.directionalLight.shadow.camera.far = 100;
    this.directionalLight.shadow.camera.left = -30;
    this.directionalLight.shadow.camera.right = 30;
    this.directionalLight.shadow.camera.top = 30;
    this.directionalLight.shadow.camera.bottom = -30;
    this.directionalLight.shadow.bias = -0.001;
    this.directionalLight.shadow.normalBias = 0.02; // Reduced normal bias for better quality
    
    // Hemisphere light for more natural outdoor lighting
    this.hemisphereLight.position.set(0, 20, 0);
    
    // Add all lights to scene
    scene.add(this.ambientLight);
    scene.add(this.directionalLight);
    scene.add(this.hemisphereLight);
    
    // Add a couple of point lights
    this.addPointLight(new Vector3(0, 5, 0), 0xffaa00, 1, 20);
    this.addPointLight(new Vector3(10, 3, 10), 0x00aaff, 0.5, 15);
    
    // Enable shadows on the renderer
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  },
  
  // Toggle between day and night
  toggleDayNight: function() {
    this.isDay = !this.isDay;
    this.targetIntensity = this.isDay ? this.dayIntensity : this.nightIntensity;
    
    // Update light colors for day/night
    if (this.isDay) {
      this.directionalLight.color.set(0xffffff);
      // Set sky and ground colors for day
      this.hemisphereLight.color.set(0xffffbb);
      this.hemisphereLight.groundColor.set(0x080820);
    } else {
      this.directionalLight.color.set(0x4444aa);
      // Set sky and ground colors for night
      this.hemisphereLight.color.set(0x222244);
      this.hemisphereLight.groundColor.set(0x000022);
    }
    
    // Update the light's internal state
    this.hemisphereLight.dispose();
    this.hemisphereLight = new HemisphereLight(
      this.hemisphereLight.color.getHex(),
      this.hemisphereLight.groundColor.getHex(),
      0.7
    );
    
    // Update position and re-add to scene
    this.hemisphereLight.position.set(0, 20, 0);
    scene.add(this.hemisphereLight);
  },
  
  // Add a point light to the scene
  addPointLight: function(position: Vector3, color: number, intensity: number, distance: number) {
    const light = new PointLight(color, intensity, distance);
    light.position.copy(position);
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 50;
    
    this.pointLights.push(light);
    scene.add(light);
    
    // Add a small helper sphere to visualize the light
    const sphereSize = 0.2;
    const pointLightHelper = new Mesh(
      new SphereGeometry(sphereSize, 16, 8),
      new MeshBasicMaterial({ color: color })
    );
    pointLightHelper.position.copy(position);
    scene.add(pointLightHelper);
    
    return light;
  },
  
  // Update lighting (call in animation loop)
  update: function() {
    // Smooth transition between day and night
    if (Math.abs(this.currentIntensity - this.targetIntensity) > 0.001) {
      this.currentIntensity += (this.targetIntensity - this.currentIntensity) * this.transitionSpeed;
      
      // Update light intensities with ambient occlusion factor
      const aoFactor = this.useAO ? (1.0 - this.aoIntensity) + this.currentIntensity * this.aoIntensity : 1.0;
      
      this.ambientLight.intensity = this.currentIntensity * 0.5 * aoFactor;
      this.directionalLight.intensity = this.currentIntensity;
      this.hemisphereLight.intensity = this.currentIntensity * 0.7 * aoFactor;
      
      // Update shadow intensity based on time of day
      this.directionalLight.shadow.bias = -0.001 * (1.0 - this.currentIntensity * 0.5);
    }
    
    // Animate point lights (subtle flicker and movement)
    const time = Date.now() * 0.001;
    this.pointLights.forEach((light, i) => {
      // Add subtle movement to point lights
      if (i % 2 === 0) {
        const offset = i * 10;
        light.position.x += Math.sin(time * 0.5 + offset) * 0.01;
        light.position.z += Math.cos(time * 0.3 + offset) * 0.01;
        
        // Subtle flicker effect
        light.intensity = 0.8 + Math.sin(time * 3 + offset) * 0.1;
      }
    });
  }
};

// Initialize lighting
lighting.init();

// Create a skybox
function createSkybox() {
  const skyGeometry = new THREE.SphereGeometry(500, 60, 40);
  const skyMaterial = new THREE.MeshBasicMaterial({
    map: createGradientTexture(),
    side: THREE.BackSide,
    fog: false
  });
  
  const skybox = new THREE.Mesh(skyGeometry, skyMaterial);
  scene.add(skybox);
  return skybox;
}

// Create gradient texture for skybox
function createGradientTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  
  if (!context) return new THREE.Texture();
  
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#87CEEB');  // Sky blue
  gradient.addColorStop(0.5, '#1E90FF'); // Dodger blue
  gradient.addColorStop(1, '#000033');  // Dark blue
  
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// Create environment map for reflections
function createEnvironmentMap() {
  const loader = new THREE.CubeTextureLoader();
  const texture = loader.load([
    'textures/cube/SwedishRoyalCastle/px.jpg',
    'textures/cube/SwedishRoyalCastle/nx.jpg',
    'textures/cube/SwedishRoyalCastle/py.jpg',
    'textures/cube/SwedishRoyalCastle/ny.jpg',
    'textures/cube/SwedishRoyalCastle/pz.jpg',
    'textures/cube/SwedishRoyalCastle/nz.jpg'
  ]);
  
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Initialize environment
const skybox = createSkybox();
// const envMap = createEnvironmentMap(); // Uncomment if you have environment map textures

// Add ground plane
const groundGeometry = new THREE.PlaneGeometry(50, 50);
const groundMaterial = new THREE.MeshStandardMaterial({ 
  color: 0x333333,
  roughness: 0.8,
  metalness: 0.2
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -2;
ground.receiveShadow = true;
scene.add(ground);

// Add grid helper
const gridHelper = new THREE.GridHelper(50, 50, 0x555555, 0x333333);
gridHelper.position.y = -1.99; // Slightly above the ground to prevent z-fighting
scene.add(gridHelper);

// Add lighting controls to UI
function addLightingControls() {
  const uiControls = document.getElementById('ui-controls');
  if (!uiControls) return;
  
  // Container for lighting controls
  const lightingContainer = document.createElement('div');
  lightingContainer.style.marginTop = '15px';
  lightingContainer.style.padding = '10px';
  lightingContainer.style.borderTop = '1px solid #444';
  
  // Day/Night toggle
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'shape-btn';
  toggleBtn.textContent = 'Toggle Day/Night';
  toggleBtn.style.marginRight = '10px';
  toggleBtn.onclick = () => lighting.toggleDayNight();
  
  // Ambient Occlusion toggle
  const aoToggle = document.createElement('button');
  aoToggle.className = 'shape-btn';
  aoToggle.textContent = 'Toggle AO';
  aoToggle.title = 'Toggle Ambient Occlusion';
  aoToggle.onclick = () => {
    lighting.useAO = !lighting.useAO;
    aoToggle.style.backgroundColor = lighting.useAO ? '#4CAF50' : '#f44336';
  };
  aoToggle.style.backgroundColor = lighting.useAO ? '#4CAF50' : '#f44336';
  
  // Add controls to container
  lightingContainer.appendChild(toggleBtn);
  lightingContainer.appendChild(aoToggle);
  uiControls.appendChild(lightingContainer);
  
  uiControls.appendChild(toggleBtn);
}

// Call this when initializing the UI
addLightingControls();

// Set up orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Texture cache
const textureLoader = new ThreeTextureLoader();
const textureCache = new Map<string, Texture>();

// Function to load texture with caching
function loadTexture(url: string, repeat: number = 1): Texture | null {
  if (textureCache.has(url)) {
    return textureCache.get(url)!;
  }
  
  try {
    const texture = textureLoader.load(url);
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(repeat, repeat);
    textureCache.set(url, texture);
    return texture;
  } catch (error) {
    console.error(`Failed to load texture: ${url}`, error);
    return null;
  }
}

// Store all shapes for animation
const shapes: Mesh[] = [];

// Create procedural textures for testing (since we don't have actual files)
function createProceduralTexture(type: string): Texture | null {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  
  // Create different patterns based on type
  switch (type) {
    case 'wood':
      // Brown wood grain pattern
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(60, 30, 15, ${Math.random() * 0.5})`;
        ctx.lineWidth = 1 + Math.random() * 5;
        const y = Math.random() * canvas.height;
        ctx.moveTo(0, y);
        
        // Wavy line
        for (let x = 0; x < canvas.width; x += 10) {
          ctx.lineTo(x, y + Math.sin(x/20) * 5);
        }
        ctx.stroke();
      }
      break;
      
    case 'metal':
      // Metallic brushed texture
      ctx.fillStyle = '#999999';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < 100; i++) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.random() * 0.2})`;
        ctx.lineWidth = 1;
        ctx.moveTo(0, Math.random() * canvas.height);
        ctx.lineTo(canvas.width, Math.random() * canvas.height);
        ctx.stroke();
      }
      break;
      
    case 'marble':
      // Marble-like texture
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add veins
      for (let i = 0; i < 10; i++) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(150, 150, 150, ${0.2 + Math.random() * 0.3})`;
        ctx.lineWidth = 1 + Math.random() * 3;
        
        let x = Math.random() * canvas.width;
        let y = 0;
        ctx.moveTo(x, y);
        
        for (let j = 0; j < 20; j++) {
          x += (Math.random() - 0.5) * 40;
          y += canvas.height / 20;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;

    case 'brick':
      // Brick pattern
      const brickWidth = 100;
      const brickHeight = 40;
      const brickPadding = 4;
      
      // Base color
      ctx.fillStyle = '#B22222';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw bricks
      for (let y = 0; y < canvas.height; y += brickHeight + brickPadding) {
        const offset = (y / (brickHeight + brickPadding)) % 2 ? 0 : -brickWidth / 2;
        
        for (let x = offset; x < canvas.width; x += brickWidth + brickPadding) {
          // Brick color with some variation
          const hue = 0 + (Math.random() * 10 - 5);
          ctx.fillStyle = `hsl(${hue}, 60%, 40%)`;
          
          // Draw brick with highlight
          ctx.fillRect(x, y, brickWidth, brickHeight);
          
          // Add some texture
          ctx.strokeStyle = 'rgba(0,0,0,0.1)';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, brickWidth, brickHeight);
        }
      }
      break;

    case 'carpet':
      // Soft carpet-like texture
      ctx.fillStyle = '#4A6B8A';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add noise
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        // Add some noise
        const noise = Math.random() * 20;
        data[i] += noise;     // R
        data[i + 1] += noise; // G
        data[i + 2] += noise; // B
      }
      
      ctx.putImageData(imageData, 0, 0);
      break;

    case 'tiles':
      // Ceramic tile pattern
      const tileSize = 60;
      const groutWidth = 4;
      
      // Grout
      ctx.fillStyle = '#888888';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Tiles
      for (let y = 0; y < canvas.height; y += tileSize + groutWidth) {
        for (let x = 0; x < canvas.width; x += tileSize + groutWidth) {
          // Random tile color with slight variation
          const hue = 200 + Math.random() * 20;
          ctx.fillStyle = `hsl(${hue}, 30%, 80%)`;
          ctx.fillRect(x, y, tileSize, tileSize);
          
          // Add some texture to tiles
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
        }
      }
      break;
      
    case 'checkerboard':
      // Create a checkerboard pattern
      const checkerSize = canvas.width / 8;
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          ctx.fillStyle = (x + y) % 2 === 0 ? '#ffffff' : '#444444';
          ctx.fillRect(x * checkerSize, y * checkerSize, checkerSize, checkerSize);
        }
      }
      break;
      
    default:
      // Default colored pattern
      ctx.fillStyle = '#cccccc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw random circles
      for (let i = 0; i < 50; i++) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(
          ${Math.random() * 255}, 
          ${Math.random() * 255}, 
          ${Math.random() * 255}, 
          ${0.1 + Math.random() * 0.4}
        )`;
        ctx.arc(
          Math.random() * canvas.width,
          Math.random() * canvas.height,
          5 + Math.random() * 30,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
  }
  
  const texture = new Texture(canvas);
  texture.needsUpdate = true;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  
  // Cache the texture
  const cacheKey = `procedural_${type}`;
  textureCache.set(cacheKey, texture);
  
  return texture;
}

// --- Shape Creation Function ---
let shapeCount = 0;

const createInteractiveShape = (
  shapeType: ShapeType, 
  position: Vector3, 
  color: number,
  textureType: string | null = null
) => {
  // Create geometry based on shape type
  let geometry;
  const baseSize = 0.8 + Math.random() * 0.4;
  
  switch (shapeType) {
    case 'box':
      geometry = new BoxGeometry(baseSize, baseSize, baseSize);
      break;
    case 'sphere':
      geometry = new SphereGeometry(baseSize / 2, 32, 32);
      break;
    case 'cylinder':
      geometry = new CylinderGeometry(baseSize / 2, baseSize / 2, baseSize, 32);
      break;
    case 'cone':
      geometry = new ConeGeometry(baseSize / 2, baseSize, 32);
      break;
    case 'torus':
      geometry = new TorusGeometry(baseSize / 2, baseSize / 5, 16, 32);
      break;
    case 'tetrahedron':
      geometry = new TetrahedronGeometry(baseSize / 1.5);
      break;
    default:
      geometry = new BoxGeometry(baseSize, baseSize, baseSize);
  }
  
  // Create material with optional texture
  const materialOptions: any = { 
    color,
    metalness: 0.3,
    roughness: 0.7
  };
  
  // Apply texture if specified
  if (textureType) {
    const texture = createProceduralTexture(textureType);
    if (texture) {
      materialOptions.map = texture;
    }
  }
  
  const material = new MeshStandardMaterial(materialOptions);
  
  // Create mesh
  const shape = new Mesh(geometry, material);
  shape.position.copy(position);
  shape.name = `${shapeType}_${shapeCount++}`;
  
  // Enable shadows for all objects
  shape.castShadow = true;
  shape.receiveShadow = true;
  
  // Add random rotation speed for smooth animation
  (shape as any).rotationSpeed = {
    x: (Math.random() - 0.5) * 0.005,
    y: (Math.random() - 0.5) * 0.005,
    z: (Math.random() - 0.5) * 0.005
  };
  
  // Add to shapes array for animation
  shapes.push(shape);
  
  // Make the shape interactive with all our capabilities
  makeSelectable(shape, {
    highlightColor: 0xffffff,
    onSelect: () => {
      console.log(`Shape selected: ${shape.name}`);
    }
  });
  
  makeDraggable(shape, {
    onDragStart: () => {
      console.log(`Started dragging shape: ${shape.name}`);
    },
    onDragEnd: () => {
      console.log(`Finished dragging shape: ${shape.name}`);
    }
  });
  
  makeScalable(shape, {
    minScale: 0.3,
    maxScale: 3.0,
    onScaleStart: () => {
      console.log(`Started scaling shape: ${shape.name}`);
    },
    onScaleEnd: () => {
      console.log(`Finished scaling shape: ${shape.name}`);
    }
  });
  
  makeRotatable(shape, {
    onRotateStart: () => {
      console.log(`Started rotating shape: ${shape.name}`);
    },
    onRotateEnd: () => {
      console.log(`Finished rotating shape: ${shape.name}`);
    }
  });
  
  scene.add(shape);
  return shape;
};

// Create initial diverse shapes with different textures
createInteractiveShape('box', new Vector3(-4, 0, 0), 0xff0000, 'wood');
createInteractiveShape('sphere', new Vector3(-2, 0, 0), 0x00ff00, 'metal');
createInteractiveShape('cylinder', new Vector3(0, 0, 0), 0x0000ff, 'marble');
createInteractiveShape('cone', new Vector3(2, 0, 0), 0xffff00, 'brick');
createInteractiveShape('torus', new Vector3(4, 0, 0), 0xff00ff, 'carpet');
createInteractiveShape('tetrahedron', new Vector3(6, 0, 0), 0x00ffff, 'tiles');

// Create Interaction Manager
const interactionManager = new InteractionManager(scene, camera, renderer.domElement, controls);

// Helper function to make elements Vision Pro friendly
function makeElementVisionProFriendly(element: HTMLElement): void {
  // Make sure the element has sufficient size for hand tracking
  if (!element.style.minWidth) element.style.minWidth = '40px';
  if (!element.style.minHeight) element.style.minHeight = '40px';
  
  // Prevent events from propagating to three.js handler
  element.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
  });
  
  element.addEventListener('pointermove', (e) => {
    e.stopPropagation();
  });
  
  element.addEventListener('pointerup', (e) => {
    e.stopPropagation();
  });
  
  // Make sure the element is focusable
  if (!element.hasAttribute('tabindex')) {
    element.setAttribute('tabindex', '0');
  }
}

// Set up shape creation UI
function setupShapeCreationUI() {
  const uiControls = document.getElementById('ui-controls');
  
  if (!uiControls) {
    console.error('Could not find UI controls container');
    return;
  }
  
  // Create shape controls
  const shapeControls = document.createElement('div');
  shapeControls.id = 'shape-controls';
  
  // Define the shapes we support
  const shapes: ShapeType[] = ['box', 'sphere', 'cylinder', 'cone', 'torus', 'tetrahedron'];
  
  // Create a button for each shape
  shapes.forEach(shape => {
    const button = document.createElement('button');
    button.className = 'shape-btn';
    button.setAttribute('data-shape', shape);
    
    // Capitalize the first letter of the shape name
    button.textContent = shape.charAt(0).toUpperCase() + shape.slice(1);
    
    // Make the button Vision Pro friendly
    makeElementVisionProFriendly(button);
    
    // Add click handler to create the shape
    button.addEventListener('click', () => {
      // Generate random position
      const randomPosition = new Vector3(
        (Math.random() - 0.5) * 6,  // x between -3 and 3
        (Math.random() - 0.5) * 4,  // y between -2 and 2
        (Math.random() - 0.5) * 2   // z between -1 and 1
      );
      
      // Generate random color
      const randomColor = new Color(Math.random(), Math.random(), Math.random());
      const colorValue = randomColor.getHex();
      
      // Randomly choose a texture (or no texture)
      const textureTypes = ['wood', 'metal', 'marble', 'checkerboard', null];
      const randomTexture = textureTypes[Math.floor(Math.random() * textureTypes.length)];
      
      // Create the shape
      const newShape = createInteractiveShape(shape, randomPosition, colorValue, randomTexture);
      
      console.log(`Created new ${shape}: ${newShape.name} at position ${randomPosition.toArray().join(', ')}`);
    });
    
    // Add the button to the controls
    shapeControls.appendChild(button);
  });
  
  // Add the shape controls to the UI
  uiControls.appendChild(shapeControls);
}

// Initialize the UI when document is ready
window.addEventListener('DOMContentLoaded', setupShapeCreationUI);

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  // Update lighting
  lighting.update();
  
  // Rotate all shapes
  shapes.forEach(shape => {
    if ((shape as any).rotationSpeed) {
      shape.rotation.x += (shape as any).rotationSpeed.x;
      shape.rotation.y += (shape as any).rotationSpeed.y;
      shape.rotation.z += (shape as any).rotationSpeed.z;
    }
    
    // Update shadow matrix for moving objects
    if (shape.castShadow) {
      shape.updateMatrixWorld();
    }
  });
  
  // Only update controls if they are enabled
  if (controls.enabled) {
    controls.update();
  }
  
  renderer.render(scene, camera);
}

animate();
