import * as THREE from 'three';

export const COLLISION_DISTANCE = 40;

export function isCollision(objectA, objectB, distance = COLLISION_DISTANCE) {
  if (!objectA || !objectB) {
    return false;
  }

  const positionA = objectA.position ?? new THREE.Vector3();
  const positionB = objectB.position ?? new THREE.Vector3();

  return positionA.distanceTo(positionB) <= distance;
}

