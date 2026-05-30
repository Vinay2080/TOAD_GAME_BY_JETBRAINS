import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const MODEL_PATH = '/models/enemy.glb';

export function createEnemy() {
  const group = new THREE.Group();
  const loader = new GLTFLoader();
  const enemy = {
    group,
    model: null,
  };

  group.position.set(0, 0, 0);

  loader.load(MODEL_PATH, (gltf) => {
    const model = gltf.scene;

    model.rotation.x = Math.PI / 2;
    model.scale.setScalar(5);

    const boundingBox = new THREE.Box3().setFromObject(model);
    model.position.z = -boundingBox.min.z;

    group.add(model);
    enemy.model = model;
  });

  return enemy;
}
