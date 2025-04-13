import { Camera, Raycaster, Scene, Vector2 } from 'three';

// Create a reusable raycaster for object selection
export const createSelectionRaycaster = (): Raycaster => {
  return new Raycaster();
};

// Convert screen coordinates to normalized device coordinates (-1 to +1)
export const normalizeCoordinates = (x: number, y: number, width: number, height: number): Vector2 => {
  return new Vector2(
    (x / width) * 2 - 1,
    -(y / height) * 2 + 1
  );
};

// Find objects intersecting with a ray from the camera through a screen point
export const findIntersectedObjects = (
  raycaster: Raycaster,
  camera: Camera,
  scene: Scene,
  point: Vector2,
  recursive = true
) => {
  raycaster.setFromCamera(point, camera);
  return raycaster.intersectObjects(scene.children, recursive);
};
