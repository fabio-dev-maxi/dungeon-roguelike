import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { EntityFactoryService, EntityMeshResult } from './entity-factory.service';
import { EnvironmentFactoryService } from './environment-factory.service';
import { BoardPhysicsService } from './board-physics.service';
import { BoardUnit, UnitStats } from '../models/board-types';

@Injectable({
  providedIn: 'root'
})
export class BoardGridService {
  public boardSize = 8;
  public tileSize = 1.32;
  public offset = (this.boardSize / 2) * this.tileSize - (this.tileSize / 2);

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private units: BoardUnit[] = [];
  private staticCrates: { gridX: number; gridZ: number }[] = [];
  private staticRocks: { gridX: number; gridZ: number }[] = [];
  private highlightGroup = new THREE.Group();
  private selectionRing!: THREE.Mesh;

  private selectedUnit: BoardUnit | null = null;
  private pendingAttack: { attacker: BoardUnit; defender: BoardUnit } | null = null;
  private movingUnit: BoardUnit | null = null;
  private movePath: { gridX: number; gridZ: number; pos3D: { x: number; z: number } }[] = [];
  private currentPathIndex = 0;
  private stepProgress = 0;
  private stepSpeed = 3.5;

  constructor(
    private envFactory: EnvironmentFactoryService,
    private entityFactory: EntityFactoryService,
    private physics: BoardPhysicsService
  ) { }

  public initGrid(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    this.scene = scene;
    this.camera = camera;

    const totalBoardWidth = this.boardSize * this.tileSize;

    const floorMesh = this.envFactory.createFloorMesh(totalBoardWidth);
    this.scene.add(floorMesh);
    this.physics.createFixedGround(totalBoardWidth + 2, totalBoardWidth + 2);

    const tilesMap = this.envFactory.createTilesGroup(this.boardSize, this.tileSize, this.offset);
    this.scene.add(tilesMap);
    this.scene.add(this.highlightGroup);

    this.selectionRing = this.envFactory.createSelectionRing();
    this.scene.add(this.selectionRing);

    const wallThickness = 0.5;
    const wallOffset = totalBoardWidth / 2 + wallThickness / 2;
    this.createCaveWall(0, -wallOffset, totalBoardWidth + wallThickness * 2, wallThickness);
    this.createCaveWall(0, wallOffset, totalBoardWidth + wallThickness * 2, wallThickness);
    this.createCaveWall(-wallOffset, 0, wallThickness, totalBoardWidth);
    this.createCaveWall(wallOffset, 0, wallThickness, totalBoardWidth);

    this.spawnStaticCrate(3, 1);
    this.spawnStaticCrate(5, 2);
    this.spawnRockObstacle(0, 3);
    this.spawnRockObstacle(6, 1);
  }

  private createCaveWall(x: number, z: number, width: number, depth: number): void {
    const wallHeight = 2.4;
    const wall = this.envFactory.createCaveWallMesh(width, wallHeight, depth);
    wall.position.set(x, wallHeight / 2, z);
    this.scene.add(wall);
    this.physics.createFixedWall(x, z, width, wallHeight, depth);
  }

  private spawnRockObstacle(gridX: number, gridZ: number): void {
    const pos = this.get3DPosition(gridX, gridZ);
    const rockMesh = this.envFactory.createRockMesh();
    rockMesh.position.set(pos.x, 0.35, pos.z);
    this.scene.add(rockMesh);
    this.physics.createFixedBall(pos.x, 0.35, pos.z, 0.45);
    this.staticRocks.push({ gridX, gridZ });
  }

  private spawnStaticCrate(gridX: number, gridZ: number): void {
    const pos = this.get3DPosition(gridX, gridZ);
    const size = 0.72;
    const crateTexture = this.envFactory.createWoodCrateTexture();
    const crateMesh = this.envFactory.createCrateMesh(size, crateTexture);
    crateMesh.position.set(pos.x, size / 2, pos.z);
    this.scene.add(crateMesh);
    this.physics.createFixedBox(pos.x, size / 2, pos.z, size);
    this.staticCrates.push({ gridX, gridZ });
  }

  public spawnPartyAndBoss(): void {
    this.spawnUnit(1, 1, { name: 'Guerriero Umano', classType: 'warrior', ca: 18, maxHp: 38, currentHp: 38, atkBonus: 8, dmgMin: 8, dmgMax: 16, speedMax: 3, color: 0x64748b, isEnemy: false });
    this.spawnUnit(2, 1, { name: 'Mago Elfo', classType: 'mage', ca: 13, maxHp: 20, currentHp: 20, atkBonus: 6, dmgMin: 12, dmgMax: 28, speedMax: 3, color: 0x2563eb, isEnemy: false, isMage: true, isRanged: true });
    this.spawnUnit(1, 2, { name: 'Ladro Halfling', classType: 'rogue', ca: 16, maxHp: 26, currentHp: 26, atkBonus: 7, dmgMin: 6, dmgMax: 14, speedMax: 4, color: 0x15803d, isEnemy: false });
    this.spawnUnit(2, 2, { name: 'Chierico Nano', classType: 'cleric', ca: 17, maxHp: 34, currentHp: 34, atkBonus: 6, dmgMin: 6, dmgMax: 12, speedMax: 3, color: 0xeab308, isEnemy: false });

    this.spawnUnit(4, 4, { name: 'Drago Rosso (Grande)', ca: 21, maxHp: 85, currentHp: 85, atkBonus: 14, dmgMin: 8, dmgMax: 22, speedMax: 3, color: 0xdc2626, isEnemy: true }, true);
    this.spawnUnit(6, 3, { name: 'Goblin Esploratore', classType: 'goblin', ca: 13, maxHp: 12, currentHp: 12, atkBonus: 4, dmgMin: 2, dmgMax: 6, speedMax: 3, color: 0x15803d, isEnemy: true });
    this.spawnUnit(3, 6, { name: 'Goblin Guerriero', classType: 'goblin', ca: 14, maxHp: 14, currentHp: 14, atkBonus: 5, dmgMin: 3, dmgMax: 7, speedMax: 3, color: 0x15803d, isEnemy: true });
  }

  private spawnUnit(gridX: number, gridZ: number, stats: UnitStats, isDragon = false): void {
    let resultMesh: EntityMeshResult;
    if (isDragon) {
      resultMesh = this.entityFactory.createDragonMesh(this.tileSize);
    } else if (stats.classType === 'goblin') {
      resultMesh = this.entityFactory.createGoblinMesh(stats.color);
    } else {
      resultMesh = this.entityFactory.createHumanMesh(stats.color, stats.classType);
    }

    const { group, torsoMesh, armRGroup } = resultMesh;
    let occupiedTiles = [{ x: gridX, z: gridZ }];
    let posX = 0, posZ = 0;

    if (isDragon) {
      occupiedTiles = [
        { x: gridX, z: gridZ }, { x: gridX + 1, z: gridZ },
        { x: gridX, z: gridZ + 1 }, { x: gridX + 1, z: gridZ + 1 }
      ];
      const p1 = this.get3DPosition(gridX, gridZ);
      const p2 = this.get3DPosition(gridX + 1, gridZ + 1);
      posX = (p1.x + p2.x) / 2; posZ = (p1.z + p2.z) / 2;
    } else {
      const p = this.get3DPosition(gridX, gridZ);
      posX = p.x; posZ = p.z;
    }

    group.position.set(posX, 0.0, posZ);
    this.scene.add(group);

    const colSize = isDragon ? this.tileSize : 0.35;
    const body = this.physics.createKinematicBody(posX, 0.0, posZ, colSize);

    const unitData: BoardUnit = {
      root: group,
      body,
      torsoMesh,
      armRGroup,
      gridX, gridZ,
      occupiedTiles,
      originalColorHex: stats.color,
      stats: { ...stats, currentHp: stats.maxHp },
      isRagdoll: false
    };

    group.traverse(child => { if (child instanceof THREE.Mesh) child.userData = { isPiece: true, unitData }; });
    this.units.push(unitData);
  }

  public getUnits(): BoardUnit[] { return this.units; }
  public getSelectedUnit(): BoardUnit | null { return this.selectedUnit; }
  public getPendingAttack() { return this.pendingAttack; }
  public clearPendingAttack() { this.pendingAttack = null; }

  public bindPointerEvents(canvas: HTMLCanvasElement, onCallback: (event: any) => void): void {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    window.addEventListener('pointerup', (e) => {
      if (this.movingUnit) return;

      const rect = canvas.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, this.camera);

      const intersects = raycaster.intersectObjects(this.scene.children, true);
      let hitPiece: BoardUnit | null = null;
      let hitTile: { x: number; z: number } | null = null;

      for (let i = 0; i < intersects.length; i++) {
        const obj = intersects[i].object;
        let curr: THREE.Object3D | null = obj;
        while (curr && !curr.userData?.['isPiece']) { curr = curr.parent; }
        if (curr && curr.userData?.['isPiece'] && !hitPiece) { hitPiece = curr.userData['unitData']; }
        if ((obj.userData?.['isTile'] || obj.userData?.['isHighlight']) && !hitTile) { hitTile = { x: obj.userData['gridX'], z: obj.userData['gridZ'] }; }
      }

      if (hitPiece && hitPiece.stats.currentHp > 0) {
        if (this.selectedUnit && hitPiece !== this.selectedUnit) {
          const dist = this.getDistanceBetweenUnits(this.selectedUnit, hitPiece);

          if (this.selectedUnit.stats.isRanged && dist > 1 && dist <= 6 && this.selectedUnit.stats.isEnemy !== hitPiece.stats.isEnemy) {
            this.pendingAttack = { attacker: this.selectedUnit, defender: hitPiece };
            onCallback({ type: 'openSpellModal' });
            this.deselectUnit();
            return;
          }

          if (dist === 1 && this.selectedUnit.stats.isEnemy !== hitPiece.stats.isEnemy) {
            onCallback({ type: 'meleeAttack', attacker: this.selectedUnit, defender: hitPiece });
            this.deselectUnit();
            return;
          }
        }

        this.selectUnit(hitPiece);
        onCallback({ type: 'unitSelected', unit: hitPiece });
        return;
      }

      if (this.selectedUnit && hitTile) {
        const targetX = hitTile.x;
        const targetZ = hitTile.z;
        const dist = Math.max(Math.abs(targetX - this.selectedUnit.gridX), Math.abs(targetZ - this.selectedUnit.gridZ));
        const is2x2 = this.selectedUnit.occupiedTiles.length > 1;

        let isValid = false;
        if (is2x2) {
          isValid = targetX >= 0 && targetX < this.boardSize - 1 && targetZ >= 0 && targetZ < this.boardSize - 1 &&
            !this.isCellOccupied(targetX, targetZ, this.selectedUnit) &&
            !this.isCellOccupied(targetX + 1, targetZ, this.selectedUnit) &&
            !this.isCellOccupied(targetX, targetZ + 1, this.selectedUnit) &&
            !this.isCellOccupied(targetX + 1, targetZ + 1, this.selectedUnit);
        } else {
          isValid = !this.isCellOccupied(targetX, targetZ, this.selectedUnit);
        }

        if (isValid && dist <= this.selectedUnit.stats.speedMax) {
          this.startChessMovement(this.selectedUnit, targetX, targetZ);
        }
      }
    });
  }

  public selectUnit(unit: BoardUnit): void {
    if (this.selectedUnit && this.selectedUnit !== unit) this.deselectUnit();
    this.selectedUnit = unit;

    const isDragon = unit.occupiedTiles.length > 1;
    const ringRadius = isDragon ? 2.2 : 1.0;
    this.selectionRing.scale.set(ringRadius, ringRadius, 1);
    this.selectionRing.position.set(unit.root.position.x, 0.09, unit.root.position.z);
    this.selectionRing.visible = true;

    this.updateHighlights(unit);
  }

  public deselectUnit(): void {
    if (!this.selectedUnit) return;
    this.selectedUnit = null;
    this.selectionRing.visible = false;
    this.clearHighlights();
  }

  public getDistanceBetweenUnits(unitA: BoardUnit, unitB: BoardUnit): number {
    let minDist = Infinity;
    for (const tA of unitA.occupiedTiles) {
      for (const tB of unitB.occupiedTiles) {
        const dist = Math.max(Math.abs(tA.x - tB.x), Math.abs(tA.z - tB.z));
        if (dist < minDist) minDist = dist;
      }
    }
    return minDist;
  }

  public isCellOccupied(x: number, z: number, excludeUnit?: BoardUnit): boolean {
    const hasPiece = this.units.some(u => u !== excludeUnit && u.stats.currentHp > 0 && u.occupiedTiles.some(t => t.x === x && t.z === z));
    const hasCrate = this.staticCrates.some(c => c.gridX === x && c.gridZ === z);
    const hasRock = this.staticRocks.some(r => r.gridX === x && r.gridZ === z);
    return hasPiece || hasCrate || hasRock;
  }

  private updateHighlights(selectedUnit: BoardUnit): void {
    this.clearHighlights();
    const is2x2 = selectedUnit.occupiedTiles.length > 1;

    const hlMoveMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x15803d, emissiveIntensity: 0.5, transparent: true, opacity: 0.35, depthWrite: false });
    const hlAtkMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xb91c1c, emissiveIntensity: 0.6, transparent: true, opacity: 0.45, depthWrite: false });
    const lineMatMove = new THREE.LineBasicMaterial({ color: 0x86efac });
    const lineMatAtk = new THREE.LineBasicMaterial({ color: 0xfca5a5 });

    this.units.forEach(targetUnit => {
      if (targetUnit === selectedUnit || targetUnit.stats.currentHp <= 0) return;
      if (targetUnit.stats.isEnemy !== selectedUnit.stats.isEnemy) {
        const dist = this.getDistanceBetweenUnits(selectedUnit, targetUnit);
        if (dist === 1 || (selectedUnit.stats.isRanged && dist <= 6)) {
          targetUnit.occupiedTiles.forEach(tile => {
            const geo = new THREE.PlaneGeometry(this.tileSize * 0.92, this.tileSize * 0.92);
            geo.rotateX(-Math.PI / 2);
            const hl = new THREE.Mesh(geo, hlAtkMat);
            const pos = this.get3DPosition(tile.x, tile.z);
            hl.position.set(pos.x, 0.12, pos.z);
            hl.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineMatAtk));
            hl.userData = { isHighlight: true, gridX: tile.x, gridZ: tile.z };
            this.highlightGroup.add(hl);
          });
        }
      }
    });

    const maxX = is2x2 ? this.boardSize - 1 : this.boardSize;
    const maxZ = is2x2 ? this.boardSize - 1 : this.boardSize;

    for (let x = 0; x < maxX; x++) {
      for (let z = 0; z < maxZ; z++) {
        const dist = Math.max(Math.abs(x - selectedUnit.gridX), Math.abs(z - selectedUnit.gridZ));
        let isValid = is2x2
          ? !this.isCellOccupied(x, z, selectedUnit) && !this.isCellOccupied(x + 1, z, selectedUnit) && !this.isCellOccupied(x, z + 1, selectedUnit) && !this.isCellOccupied(x + 1, z + 1, selectedUnit)
          : !this.isCellOccupied(x, z, selectedUnit);

        if (dist > 0 && dist <= selectedUnit.stats.speedMax && isValid) {
          const w = is2x2 ? this.tileSize * 2 * 0.94 : this.tileSize * 0.92;
          const h = is2x2 ? this.tileSize * 2 * 0.94 : this.tileSize * 0.92;
          const geo = new THREE.PlaneGeometry(w, h);
          geo.rotateX(-Math.PI / 2);

          const hl = new THREE.Mesh(geo, hlMoveMat);
          const pos = this.get3DPositionForUnit(selectedUnit, x, z);
          hl.position.set(pos.x, 0.11, pos.z);
          hl.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineMatMove));

          hl.userData = { isHighlight: true, gridX: x, gridZ: z };
          this.highlightGroup.add(hl);
        }
      }
    }
  }

  private clearHighlights(): void {
    while (this.highlightGroup.children.length > 0) this.highlightGroup.remove(this.highlightGroup.children[0]);
  }

  private startChessMovement(unit: BoardUnit, targetX: number, targetZ: number): void {
    let currX = unit.gridX; let currZ = unit.gridZ;
    this.movePath = [];

    while (currX !== targetX || currZ !== targetZ) {
      if (currX < targetX) currX++; else if (currX > targetX) currX--;
      if (currZ < targetZ) currZ++; else if (currZ > targetZ) currZ--;
      this.movePath.push({ gridX: currX, gridZ: currZ, pos3D: this.get3DPositionForUnit(unit, currX, currZ) });
    }

    this.movingUnit = unit; this.currentPathIndex = 0; this.stepProgress = 0;
  }

  public updateMovement(delta: number): void {
    if (!this.movingUnit || this.movePath.length === 0) return;

    this.stepProgress += delta * this.stepSpeed;
    const currentStep = this.movePath[this.currentPathIndex];
    const startPos = this.currentPathIndex === 0
      ? this.get3DPositionForUnit(this.movingUnit, this.movingUnit.gridX, this.movingUnit.gridZ)
      : this.movePath[this.currentPathIndex - 1].pos3D;

    const dx = currentStep.pos3D.x - startPos.x;
    const dz = currentStep.pos3D.z - startPos.z;
    if (dx !== 0 || dz !== 0) {
      const targetAngle = Math.atan2(dx, dz);
      this.movingUnit.root.rotation.y = THREE.MathUtils.lerp(
        this.movingUnit.root.rotation.y,
        targetAngle,
        Math.min(delta * 16, 1)
      );
    }

    this.movingUnit.root.position.x = THREE.MathUtils.lerp(startPos.x, currentStep.pos3D.x, Math.min(this.stepProgress, 1));
    this.movingUnit.root.position.z = THREE.MathUtils.lerp(startPos.z, currentStep.pos3D.z, Math.min(this.stepProgress, 1));
    this.movingUnit.root.position.y = Math.sin(Math.min(this.stepProgress, 1) * Math.PI) * 0.2;

    if (this.selectedUnit === this.movingUnit) {
      this.selectionRing.position.set(this.movingUnit.root.position.x, 0.09, this.movingUnit.root.position.z);
    }

    if (this.stepProgress >= 1) {
      this.stepProgress = 0;
      this.movingUnit.gridX = currentStep.gridX;
      this.movingUnit.gridZ = currentStep.gridZ;

      if (this.movingUnit.occupiedTiles.length > 1) {
        this.movingUnit.occupiedTiles = [
          { x: currentStep.gridX, z: currentStep.gridZ },
          { x: currentStep.gridX + 1, z: currentStep.gridZ },
          { x: currentStep.gridX, z: currentStep.gridZ + 1 },
          { x: currentStep.gridX + 1, z: currentStep.gridZ + 1 }
        ];
      } else {
        this.movingUnit.occupiedTiles = [{ x: currentStep.gridX, z: currentStep.gridZ }];
      }

      this.currentPathIndex++;

      if (this.currentPathIndex >= this.movePath.length) {
        this.movingUnit.root.position.y = 0;
        const finishedUnit = this.movingUnit;
        this.movingUnit = null;
        this.movePath = [];
        this.selectUnit(finishedUnit);
      }
    }
  }

  public get3DPosition(gridX: number, gridZ: number): { x: number; z: number } {
    return { x: gridX * this.tileSize - this.offset, z: gridZ * this.tileSize - this.offset };
  }

  public get3DPositionForUnit(unit: BoardUnit, gridX: number, gridZ: number): { x: number; z: number } {
    if (unit.occupiedTiles.length > 1) {
      const p1 = this.get3DPosition(gridX, gridZ);
      const p2 = this.get3DPosition(gridX + 1, gridZ + 1);
      return { x: (p1.x + p2.x) / 2, z: (p1.z + p2.z) / 2 };
    }
    return this.get3DPosition(gridX, gridZ);
  }
}