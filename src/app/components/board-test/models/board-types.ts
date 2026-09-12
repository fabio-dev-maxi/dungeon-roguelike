import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

export interface UnitStats {
  name: string;
  ca: number;
  maxHp: number;
  currentHp: number;
  atkBonus: number;
  dmgMin: number;
  dmgMax: number;
  speedMax: number;
  color: number;
  isEnemy: boolean;
  isMage?: boolean;
  isCleric?: boolean;
  isRanged?: boolean;
  classType?: 'warrior' | 'mage' | 'rogue' | 'cleric' | 'goblin';
}

export interface BoardUnit {
  root: THREE.Group;
  body: RAPIER.RigidBody | null;
  torsoMesh: THREE.Mesh;
  armRGroup?: THREE.Group;
  gridX: number;
  gridZ: number;
  occupiedTiles: { x: number; z: number }[];
  originalColorHex: number;
  stats: UnitStats;
  isRagdoll: boolean;
}