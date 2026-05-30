import * as THREE from 'three';
import './style.css';
import { createPlayer } from './components/Player.js';
import { createCamera } from './components/Camera.js';
import { createRenderer } from './components/Renderer.js';
import { createEnemy } from './components/Enemy.js';
import { isCollision } from './utils/collision.js';

const MOVE_SPEED = 2.25;
const JUMP_HEIGHT = 20;
const JUMP_DISTANCE = 60;
const MODEL_ROTATION_OFFSET = -Math.PI / 2;
const MODEL_BASE_ROTATION = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(Math.PI / 2, 0, 0),
);
const WORLD_UP = new THREE.Vector3(0, 0, 1);
const ENEMY_SPAWN_INTERVAL_MS = 2500;
const MAP_EXTENT = 1200;
const ENEMY_SPEED = 120;

const scene = new THREE.Scene();

const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(-100, -100, 200);
scene.add(directionalLight);

const grid = new THREE.GridHelper(6000, 300, 0x7a7a7a, 0x3f3f3f);
grid.rotation.x = Math.PI / 2;
scene.add(grid);

const player = createPlayer();
scene.add(player.group);

const camera = createCamera();
player.group.add(camera);

const renderer = createRenderer();
const clock = new THREE.Clock();

const enemies = [];
const enemySpawnPositions = [
  new THREE.Vector3(-MAP_EXTENT, -MAP_EXTENT, 0),
  new THREE.Vector3(-MAP_EXTENT, MAP_EXTENT, 0),
  new THREE.Vector3(MAP_EXTENT, -MAP_EXTENT, 0),
  new THREE.Vector3(MAP_EXTENT, MAP_EXTENT, 0),
];
let nextSpawnIndex = 0;

function spawnEnemy() {
  const enemy = createEnemy();
  const spawnPosition = enemySpawnPositions[nextSpawnIndex];

  enemy.group.position.copy(spawnPosition);
  scene.add(enemy.group);
  enemies.push(enemy);

  nextSpawnIndex = (nextSpawnIndex + 1) % enemySpawnPositions.length;
}

setInterval(spawnEnemy, ENEMY_SPAWN_INTERVAL_MS);
spawnEnemy();

const inputQueue = [];
const moveState = {
  active: false,
  direction: new THREE.Vector3(),
  progress: 0,
  startPosition: new THREE.Vector3(),
  endPosition: new THREE.Vector3(),
  baseZ: 0,
  targetRotationZ: 0,
};

const directionByKey = {
  ArrowUp: new THREE.Vector3(0, 1, 0),
  ArrowDown: new THREE.Vector3(0, -1, 0),
  ArrowLeft: new THREE.Vector3(-1, 0, 0),
  ArrowRight: new THREE.Vector3(1, 0, 0),
};

window.addEventListener('keydown', (event) => {
  if (!directionByKey[event.key]) {
    return;
  }

  inputQueue.push(event.key);
});

function beginMove(direction) {
  const intendedPosition = player.group.position
    .clone()
    .addScaledVector(direction, JUMP_DISTANCE);

  const wouldCollide = enemies.some((enemy) =>
    isCollision({ position: intendedPosition }, enemy.group),
  );

  if (wouldCollide) {
    return;
  }

  moveState.active = true;
  moveState.progress = 0;
  moveState.direction.copy(direction).normalize();
  moveState.startPosition.copy(player.group.position);
  moveState.endPosition.copy(intendedPosition);
  moveState.baseZ = player.group.position.z;
  moveState.targetRotationZ =
    Math.atan2(moveState.direction.y, moveState.direction.x) +
    MODEL_ROTATION_OFFSET + Math.PI;

  if (player.model) {
    const yaw = new THREE.Quaternion().setFromAxisAngle(
      WORLD_UP,
      moveState.targetRotationZ,
    );

    player.model.quaternion.copy(MODEL_BASE_ROTATION);
    player.model.quaternion.premultiply(yaw);
  }
}

function updateMove(delta) {
  if (!moveState.active) {
    const nextKey = inputQueue.shift();
    if (nextKey) {
      beginMove(directionByKey[nextKey]);
    }
    return;
  }

  moveState.progress = Math.min(moveState.progress + MOVE_SPEED * delta, 1);
  const moveOffset = moveState.direction
    .clone()
    .multiplyScalar(JUMP_DISTANCE * moveState.progress);
  const jumpOffset = Math.sin(moveState.progress * Math.PI) * JUMP_HEIGHT;

  player.group.position.set(
    moveState.startPosition.x + moveOffset.x,
    moveState.startPosition.y + moveOffset.y,
    moveState.baseZ + jumpOffset,
  );

  if (moveState.progress >= 1) {
    player.group.position.set(
      moveState.endPosition.x,
      moveState.endPosition.y,
      moveState.baseZ,
    );
    moveState.active = false;
  }
}

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  updateMove(delta);
  enemies.forEach((enemy) => {
    const toPlayer = player.group.position.clone().sub(enemy.group.position);
    if (toPlayer.lengthSq() === 0) {
      return;
    }

    const direction = toPlayer.normalize();
    const intendedPosition = enemy.group.position
      .clone()
      .addScaledVector(direction, ENEMY_SPEED * delta);
    const wouldCollide = enemies.some(
      (otherEnemy) =>
        otherEnemy !== enemy &&
        isCollision({ position: intendedPosition }, otherEnemy.group),
    );

    if (!wouldCollide) {
      enemy.group.position.copy(intendedPosition);
    }

    if (enemy.model) {
      const yaw = new THREE.Quaternion().setFromAxisAngle(
        WORLD_UP,
        Math.atan2(direction.y, direction.x) + MODEL_ROTATION_OFFSET + Math.PI,
      );

      enemy.model.quaternion.copy(MODEL_BASE_ROTATION);
      enemy.model.quaternion.premultiply(yaw);
    }
  });
  renderer.render(scene, camera);
});
