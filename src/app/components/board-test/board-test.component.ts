import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { IconComponent } from '../../shared/icon/icon.component';

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
  isRanged?: boolean;
  classType?: 'warrior' | 'mage' | 'rogue' | 'cleric' | 'goblin';
}

export interface BoardUnit {
  root: THREE.Group;
  body: RAPIER.RigidBody;
  torsoMesh: THREE.Mesh;
  armRGroup?: THREE.Group;
  gridX: number;
  gridZ: number;
  occupiedTiles: { x: number; z: number }[];
  originalColorHex: number;
  stats: UnitStats;
  isRagdoll: boolean;
}

@Component({
  selector: 'app-board-test',
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: './board-test.component.html',
  styleUrl: './board-test.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BoardTestComponent implements AfterViewInit, OnDestroy {
  @ViewChild('boardCanvas') private canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly statusText = signal<string>('Ti trovi nelle profondità della caverna. Tocca un eroe per muoverti o per attaccare!');
  readonly isModalOpen = signal<boolean>(false);
  readonly selectedUnitStats = signal<UnitStats | null>(null);

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private world!: RAPIER.World;
  private clock = new THREE.Clock();
  private animFrameId?: number;

  private boardSize = 8;
  private tileSize = 1.32;
  private offset = (this.boardSize / 2) * this.tileSize - (this.tileSize / 2);

  private units: BoardUnit[] = [];
  private staticCrates: { gridX: number; gridZ: number }[] = [];
  private staticRocks: { gridX: number; gridZ: number }[] = [];
  private tilesMap = new THREE.Group();
  private highlightGroup = new THREE.Group();
  private selectionRing!: THREE.Mesh;

  private selectedUnit: BoardUnit | null = null;
  private pendingAttack: { attacker: BoardUnit; defender: BoardUnit } | null = null;
  private movingUnit: BoardUnit | null = null;
  private movePath: { gridX: number; gridZ: number; pos3D: { x: number; z: number } }[] = [];
  private currentPathIndex = 0;
  private stepProgress = 0;
  private stepSpeed = 3.5;

  private d20RollState: any = null;
  private fireballAnimState: any = null;
  private lightningAnimState: any = null;
  private missileAnimState: any = null;
  private weaponAttackAnimState: any = null;
  private activeExplosion: any = null;

  constructor(private ngZone: NgZone) { }

  async ngAfterViewInit(): Promise<void> {
    await RAPIER.init();
    this.initPhysics();
    this.initThree();
    this.buildCaveEnvironment();
    this.spawnPartyAndBoss();
    this.bindPointerEvents();

    this.ngZone.runOutsideAngular(() => {
      this.animate();
    });
  }

  ngOnDestroy(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.renderer?.dispose();
  }

  // CONTROLLI TELECAMERA PER MOBILE
  focusOnSelectedUnit(): void {
    if (!this.selectedUnit) return;
    const pos = this.selectedUnit.root.position;
    this.controls.target.set(pos.x, 0, pos.z);
    this.controls.update();
  }

  rotateCamera(degrees: number): void {
    const radians = (degrees * Math.PI) / 180;
    const currentPos = this.camera.position.clone().sub(this.controls.target);
    currentPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), radians);
    this.camera.position.copy(this.controls.target).add(currentPos);
    this.controls.update();
  }

  selectSpell(spellType: 'fireball' | 'lightning' | 'missile'): void {
    if (!this.pendingAttack) return;
    const { attacker, defender } = this.pendingAttack;
    this.isModalOpen.set(false);
    this.rollD20OnBoard(attacker, defender, spellType);
    this.pendingAttack = null;
  }

  private initPhysics(): void {
    this.world = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 });
  }

  private initThree(): void {
    const canvas = this.canvasRef.nativeElement;
    this.scene = new THREE.Scene();

    this.scene.background = new THREE.Color(0x1a1622);
    this.scene.fog = new THREE.FogExp2(0x1a1622, 0.022);

    this.camera = new THREE.PerspectiveCamera(40, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    this.camera.position.set(0, 12.5, 14.5);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;

    // 1 dito: disabilitato sui controlli (libero per Raycaster/selezione)
    // 2 dita: Zoom (Pinch) e Traslazione (Pan)
    this.controls.touches = {
      ONE: undefined as any,
      TWO: THREE.TOUCH.DOLLY_PAN
    };

    this.scene.add(new THREE.AmbientLight(0x887766, 1.8));

    const caveLight = new THREE.DirectionalLight(0xffecd1, 1.6);
    caveLight.position.set(5, 15, 7);
    caveLight.castShadow = true;
    this.scene.add(caveLight);

    const torch1 = new THREE.PointLight(0xf97316, 5.0, 18);
    torch1.position.set(-6, 4.5, -5);
    const torch2 = new THREE.PointLight(0xf59e0b, 5.0, 18);
    torch2.position.set(6, 4.5, 5);
    this.scene.add(torch1, torch2);

    this.scene.add(this.tilesMap);
    this.scene.add(this.highlightGroup);

    const ringGeo = new THREE.RingGeometry(0.38, 0.52, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.9,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    });
    this.selectionRing = new THREE.Mesh(ringGeo, ringMat);
    this.selectionRing.visible = false;
    this.scene.add(this.selectionRing);
  }

  private buildCaveEnvironment(): void {
    const totalBoardWidth = this.boardSize * this.tileSize;

    const floorGeo = new THREE.BoxGeometry(totalBoardWidth + 2, 0.2, totalBoardWidth + 2);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x3d3026, roughness: 0.75, metalness: 0.1 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, -0.1, 0);
    floorMesh.receiveShadow = true;
    this.scene.add(floorMesh);

    const groundBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.1, 0);
    const groundBody = this.world.createRigidBody(groundBodyDesc);
    this.world.createCollider(RAPIER.ColliderDesc.cuboid((totalBoardWidth + 2) / 2, 0.1, (totalBoardWidth + 2) / 2), groundBody);

    const stoneTexDark = this.createCaveStoneTexture(true);
    const stoneTexLight = this.createCaveStoneTexture(false);

    const darkMat = new THREE.MeshStandardMaterial({ map: stoneTexDark, roughness: 0.7 });
    const lightMat = new THREE.MeshStandardMaterial({ map: stoneTexLight, roughness: 0.7 });

    for (let x = 0; x < this.boardSize; x++) {
      for (let z = 0; z < this.boardSize; z++) {
        const tileGeo = new THREE.BoxGeometry(this.tileSize * 0.96, 0.08, this.tileSize * 0.96);
        const isDark = (x + z) % 2 === 1;
        const tile = new THREE.Mesh(tileGeo, isDark ? darkMat : lightMat);
        tile.position.set(x * this.tileSize - this.offset, 0.04, z * this.tileSize - this.offset);
        tile.receiveShadow = true;
        tile.userData = { isTile: true, gridX: x, gridZ: z };
        this.tilesMap.add(tile);
      }
    }

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

  private createCaveStoneTexture(isDark: boolean): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = isDark ? '#4a3b2c' : '#5c4a38';
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 1500; i++) {
      const val = Math.floor(Math.random() * 40);
      ctx.fillStyle = `rgba(${130 + val}, ${110 + val}, ${90 + val}, 0.12)`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
    }

    ctx.strokeStyle = '#221a12'; ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, 248, 248);
    return new THREE.CanvasTexture(canvas);
  }

  private createCaveWall(x: number, z: number, width: number, depth: number): void {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a2b20, roughness: 0.85 });
    const wallHeight = 2.4;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(width, wallHeight, depth), wallMat);
    wall.position.set(x, wallHeight / 2, z);
    wall.castShadow = true; wall.receiveShadow = true;
    this.scene.add(wall);

    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, wallHeight / 2, z);
    const body = this.world.createRigidBody(bodyDesc);
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(width / 2, wallHeight / 2, depth / 2).setRestitution(0.4), body);
  }

  private spawnRockObstacle(gridX: number, gridZ: number): void {
    const pos = this.get3DPosition(gridX, gridZ);
    const rockGeo = new THREE.DodecahedronGeometry(0.45, 1);

    const posAttr = rockGeo.attributes['position'];
    for (let i = 0; i < posAttr.count; i++) {
      posAttr.setXYZ(
        i,
        posAttr.getX(i) + (Math.random() - 0.5) * 0.1,
        posAttr.getY(i) + (Math.random() - 0.5) * 0.1,
        posAttr.getZ(i) + (Math.random() - 0.5) * 0.1
      );
    }
    rockGeo.computeVertexNormals();

    const rockMat = new THREE.MeshStandardMaterial({ color: 0x6b5a4b, roughness: 0.95 });
    const rockMesh = new THREE.Mesh(rockGeo, rockMat);
    rockMesh.position.set(pos.x, 0.35, pos.z);
    rockMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    rockMesh.castShadow = true; rockMesh.receiveShadow = true;
    this.scene.add(rockMesh);

    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(pos.x, 0.35, pos.z);
    const body = this.world.createRigidBody(bodyDesc);
    this.world.createCollider(RAPIER.ColliderDesc.ball(0.45), body);

    this.staticRocks.push({ gridX, gridZ });
  }

  private createWoodCrateTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#8c582c'; ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(40, 20, 8, 0.08)' : 'rgba(160, 100, 40, 0.08)';
      ctx.fillRect(0, Math.random() * 512, 512, Math.random() * 3 + 1);
    }

    ctx.strokeStyle = '#221206'; ctx.lineWidth = 6;
    for (let y = 128; y < 512; y += 128) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
    }

    const bw = 40;
    ctx.fillStyle = '#613816';
    ctx.fillRect(0, 0, 512, bw); ctx.fillRect(0, 512 - bw, 512, bw);
    ctx.fillRect(0, 0, bw, 512); ctx.fillRect(512 - bw, 0, bw, 512);

    const kw = 70;
    ctx.fillStyle = '#3a4754';
    [[0, 0], [512 - kw, 0], [0, 512 - kw], [512 - kw, 512 - kw]].forEach(([cx, cy]) => {
      ctx.fillRect(cx, cy, kw, kw);
      ctx.strokeStyle = '#637585'; ctx.lineWidth = 2;
      ctx.strokeRect(cx + 2, cy + 2, kw - 4, kw - 4);
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath(); ctx.arc(cx + kw / 2, cy + kw / 2, 6, 0, Math.PI * 2); ctx.fill();
    });

    return new THREE.CanvasTexture(canvas);
  }

  private spawnStaticCrate(gridX: number, gridZ: number): void {
    const pos = this.get3DPosition(gridX, gridZ);
    const size = 0.72;
    const crateTexture = this.createWoodCrateTexture();
    const crateMat = new THREE.MeshStandardMaterial({ map: crateTexture, roughness: 0.7, metalness: 0.1 });
    const crateMesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), crateMat);
    crateMesh.position.set(pos.x, size / 2, pos.z);
    crateMesh.castShadow = true; crateMesh.receiveShadow = true;
    this.scene.add(crateMesh);

    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(pos.x, size / 2, pos.z);
    const body = this.world.createRigidBody(bodyDesc);
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(size / 2, size / 2, size / 2).setRestitution(0.3), body);
    this.staticCrates.push({ gridX, gridZ });
  }

  private createGoblinMesh(colorHex: number): { group: THREE.Group; torsoMesh: THREE.Mesh; armRGroup: THREE.Group } {
    const group = new THREE.Group();
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5 });
    const darkLeatherMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
    const redEyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.05, 12), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
    base.position.y = 0.025; base.receiveShadow = true; group.add(base);

    const legGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.28, 8);
    const legL = new THREE.Mesh(legGeo, darkLeatherMat); legL.position.set(-0.08, 0.18, 0); legL.castShadow = true;
    const legR = new THREE.Mesh(legGeo, darkLeatherMat); legR.position.set(0.08, 0.18, 0); legR.castShadow = true;
    group.add(legL, legR);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.18), darkLeatherMat);
    torso.position.y = 0.46; torso.castShadow = true; group.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), greenMat);
    head.position.y = 0.71; head.castShadow = true; group.add(head);

    const earGeo = new THREE.ConeGeometry(0.05, 0.22, 6); earGeo.rotateZ(-Math.PI / 2);
    const earL = new THREE.Mesh(earGeo, greenMat); earL.position.set(-0.16, 0.72, -0.02); earL.rotation.y = -0.3;
    const earR = new THREE.Mesh(earGeo, greenMat); earR.position.set(0.16, 0.72, -0.02); earR.rotation.y = 0.3;
    group.add(earL, earR);

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.025), redEyeMat); eyeL.position.set(-0.04, 0.73, 0.105);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.025), redEyeMat); eyeR.position.set(0.04, 0.73, 0.105);
    group.add(eyeL, eyeR);

    const armRGroup = new THREE.Group();
    armRGroup.position.set(0.15, 0.52, 0);
    const armRMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.26), greenMat);
    armRMesh.position.set(0, -0.11, 0);
    armRGroup.add(armRMesh);

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4), darkLeatherMat); handle.position.set(0, -0.2, 0.1); handle.rotation.x = Math.PI / 3;
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.22, 4), steelMat); blade.position.set(0, -0.08, 0.28); blade.rotation.x = Math.PI / 3;
    armRGroup.add(handle, blade);

    group.add(armRGroup);
    return { group, torsoMesh: torso, armRGroup };
  }

  private createHumanMesh(colorHex: number, classType: 'warrior' | 'mage' | 'rogue' | 'cleric' = 'warrior'): { group: THREE.Group; torsoMesh: THREE.Mesh; armRGroup: THREE.Group } {
    const group = new THREE.Group();
    const armorMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.4 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x1e1b18 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdbac });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.8, roughness: 0.2 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7, roughness: 0.3 });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.4, 0.06, 16), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
    base.position.y = 0.03; base.receiveShadow = true; group.add(base);

    const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.4, 10);
    const legL = new THREE.Mesh(legGeo, bootMat); legL.position.set(-0.1, 0.26, 0); legL.castShadow = true;
    const legR = new THREE.Mesh(legGeo, bootMat); legR.position.set(0.1, 0.26, 0); legR.castShadow = true;
    group.add(legL, legR);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.45, 0.22), armorMat);
    torso.position.y = 0.685; torso.castShadow = true; group.add(torso);

    const armGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.38, 10);
    const armL = new THREE.Mesh(armGeo, armorMat); armL.position.set(-0.21, 0.65, 0); armL.castShadow = true;
    group.add(armL);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), skinMat);
    head.position.y = 1.05; head.castShadow = true; group.add(head);

    const armRGroup = new THREE.Group();
    armRGroup.position.set(0.21, 0.80, 0);

    const armRMesh = new THREE.Mesh(armGeo, armorMat);
    armRMesh.position.set(0, -0.15, 0);
    armRGroup.add(armRMesh);

    if (classType === 'mage') {
      const hat = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 12), armorMat);
      hat.position.y = 1.3; hat.castShadow = true; group.add(hat);

      const staffBody = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8), woodMat);
      staffBody.position.set(0, -0.2, 0.2); staffBody.castShadow = true;
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), new THREE.MeshBasicMaterial({ color: 0x60a5fa }));
      orb.position.set(0, 0.5, 0.2);
      armRGroup.add(staffBody, orb);
    } else if (classType === 'warrior') {
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12, 0, Math.PI * 2, 0, Math.PI / 1.8), steelMat);
      helmet.position.y = 1.06; helmet.castShadow = true;
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.08), steelMat);
      visor.position.set(0, 1.06, 0.1); visor.castShadow = true;
      group.add(helmet, visor);

      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3), woodMat); hilt.position.set(0, -0.2, 0.15); hilt.rotation.x = Math.PI / 4;
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.06), steelMat); guard.position.set(0, -0.1, 0.25); guard.rotation.x = Math.PI / 4;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.9, 0.02), steelMat); blade.position.set(0, 0.25, 0.55); blade.rotation.x = Math.PI / 4; blade.castShadow = true;
      armRGroup.add(hilt, guard, blade);
    } else if (classType === 'rogue') {
      const hood = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12, 0, Math.PI * 2, 0, Math.PI / 1.5), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }));
      hood.position.y = 1.07; hood.castShadow = true; group.add(hood);

      const dHilt = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12), woodMat); dHilt.position.set(0, -0.25, 0.12); dHilt.rotation.x = Math.PI / 3;
      const dBlade = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.3, 0.015), steelMat); dBlade.position.set(0, -0.1, 0.24); dBlade.rotation.x = Math.PI / 3; dBlade.castShadow = true;
      armRGroup.add(dHilt, dBlade);
    } else if (classType === 'cleric') {
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 12), goldMat);
      crown.position.y = 1.15; crown.castShadow = true; group.add(crown);

      const shieldGroup = new THREE.Group();
      const shieldBody = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.04, 6), steelMat); shieldBody.rotation.x = Math.PI / 2; shieldBody.castShadow = true;
      const emblem = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.02), goldMat); emblem.position.z = 0.03;
      shieldGroup.add(shieldBody, emblem);
      shieldGroup.position.set(-0.26, 0.65, 0.1);
      group.add(shieldGroup);

      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45), woodMat); handle.position.set(0, -0.2, 0.1); handle.rotation.x = Math.PI / 6;
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.18), steelMat); chain.position.set(0, -0.05, 0.22); chain.rotation.x = Math.PI / 4;
      const ball = new THREE.Mesh(new THREE.DodecahedronGeometry(0.1, 0), steelMat); ball.position.set(0, 0.05, 0.32); ball.castShadow = true;
      armRGroup.add(handle, chain, ball);
    }

    group.add(armRGroup);
    return { group, torsoMesh: torso, armRGroup };
  }

  private createDragonMesh(): { group: THREE.Group; torsoMesh: THREE.Mesh; armRGroup?: THREE.Group } {
    const group = new THREE.Group();
    const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
    const darkRedMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.5 });
    const goldBellyMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.3 });
    const yellowEyeMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });

    const baseSize = this.tileSize * 2 - 0.14;
    const base = new THREE.Mesh(new THREE.BoxGeometry(baseSize, 0.06, baseSize), darkRedMat);
    base.position.y = 0.03; base.receiveShadow = true; group.add(base);

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.1, 2.0), redMat);
    body.position.y = 0.85; body.castShadow = true; group.add(body);

    const belly = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 1.8), goldBellyMat);
    belly.position.set(0, 0.72, 0.12); group.add(belly);

    const neckGroup = new THREE.Group();
    neckGroup.position.set(0, 1.3, -0.7);

    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.7), redMat);
    neck.rotation.x = 0.4; neck.castShadow = true; neckGroup.add(neck);

    const upperJaw = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.45, 1.0), redMat);
    upperJaw.position.set(0, 0.45, -0.6); upperJaw.castShadow = true;
    const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.22, 0.85), darkRedMat);
    lowerJaw.position.set(0, 0.18, -0.55); lowerJaw.castShadow = true;
    neckGroup.add(upperJaw, lowerJaw);

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06), yellowEyeMat); eyeL.position.set(-0.35, 0.58, -0.8);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.06), yellowEyeMat); eyeR.position.set(0.35, 0.58, -0.8);
    neckGroup.add(eyeL, eyeR);

    const hornGeo = new THREE.ConeGeometry(0.09, 0.55, 8); hornGeo.rotateX(-0.5);
    const hornL = new THREE.Mesh(hornGeo, hornMat); hornL.position.set(-0.28, 0.72, -0.3); hornL.rotation.z = -0.3;
    const hornR = new THREE.Mesh(hornGeo, hornMat); hornR.position.set(0.28, 0.72, -0.3); hornR.rotation.z = 0.3;
    neckGroup.add(hornL, hornR);

    group.add(neckGroup);

    for (let s = 0; s < 5; s++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.32, 6), darkRedMat);
      spike.position.set(0, 1.45, -0.6 + s * 0.38); spike.rotation.x = 0.2;
      group.add(spike);
    }

    const wingL = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 1.2), redMat);
    wingL.position.set(-1.75, 1.5, -0.1); wingL.rotation.set(0.2, 0.3, 0.45); wingL.castShadow = true;
    const wingR = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 1.2), redMat);
    wingR.position.set(1.75, 1.5, -0.1); wingR.rotation.set(0.2, -0.3, -0.45); wingR.castShadow = true;
    group.add(wingL, wingR);

    return { group, torsoMesh: body, armRGroup: neckGroup };
  }

  private spawnUnit(gridX: number, gridZ: number, stats: UnitStats, isDragon = false): void {
    let resultMesh: { group: THREE.Group; torsoMesh: THREE.Mesh; armRGroup?: THREE.Group };

    if (isDragon) {
      resultMesh = this.createDragonMesh();
    } else if (stats.classType === 'goblin') {
      resultMesh = this.createGoblinMesh(stats.color);
    } else {
      resultMesh = this.createHumanMesh(stats.color, stats.classType);
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

    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(posX, 0.0, posZ);
    const body = this.world.createRigidBody(bodyDesc);
    const colSize = isDragon ? this.tileSize : 0.35;
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(colSize, 0.5, colSize), body);

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

  private spawnPartyAndBoss(): void {
    this.spawnUnit(1, 1, { name: 'Guerriero Umano', classType: 'warrior', ca: 18, maxHp: 38, currentHp: 38, atkBonus: 8, dmgMin: 8, dmgMax: 16, speedMax: 3, color: 0x64748b, isEnemy: false });
    this.spawnUnit(2, 1, { name: 'Mago Elfo', classType: 'mage', ca: 13, maxHp: 20, currentHp: 20, atkBonus: 6, dmgMin: 12, dmgMax: 28, speedMax: 3, color: 0x2563eb, isEnemy: false, isMage: true, isRanged: true });
    this.spawnUnit(1, 2, { name: 'Ladro Halfling', classType: 'rogue', ca: 16, maxHp: 26, currentHp: 26, atkBonus: 7, dmgMin: 6, dmgMax: 14, speedMax: 4, color: 0x15803d, isEnemy: false });
    this.spawnUnit(2, 2, { name: 'Chierico Nano', classType: 'cleric', ca: 17, maxHp: 34, currentHp: 34, atkBonus: 6, dmgMin: 6, dmgMax: 12, speedMax: 3, color: 0xeab308, isEnemy: false });

    this.spawnUnit(4, 4, { name: 'Drago Rosso (Grande)', ca: 21, maxHp: 85, currentHp: 85, atkBonus: 14, dmgMin: 8, dmgMax: 22, speedMax: 3, color: 0xdc2626, isEnemy: true }, true);

    this.spawnUnit(6, 3, { name: 'Goblin Esploratore', classType: 'goblin', ca: 13, maxHp: 12, currentHp: 12, atkBonus: 4, dmgMin: 2, dmgMax: 6, speedMax: 3, color: 0x15803d, isEnemy: true });
    this.spawnUnit(3, 6, { name: 'Goblin Guerriero', classType: 'goblin', ca: 14, maxHp: 14, currentHp: 14, atkBonus: 5, dmgMin: 3, dmgMax: 7, speedMax: 3, color: 0x15803d, isEnemy: true });
  }

  // === 4. DADO d20 NUMERATO ===
  private createNumberTexture(num: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.font = 'bold 60px "Georgia", serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 10;
    ctx.strokeText(num.toString(), 64, 64);
    ctx.fillStyle = '#fef08a'; ctx.fillText(num.toString(), 64, 64);

    if (num === 6 || num === 9) {
      ctx.beginPath(); ctx.moveTo(44, 98); ctx.lineTo(84, 98);
      ctx.lineWidth = 6; ctx.strokeStyle = '#fef08a'; ctx.stroke();
    }
    return new THREE.CanvasTexture(canvas);
  }

  private createD20Mesh(): THREE.Mesh {
    const rawGeo = new THREE.IcosahedronGeometry(0.38, 0);
    const geo = rawGeo.toNonIndexed();
    const mat = new THREE.MeshStandardMaterial({ color: 0x581c87, roughness: 0.25, metalness: 0.5, flatShading: true });
    const d20Mesh = new THREE.Mesh(geo, mat);
    d20Mesh.castShadow = true;

    const posAttr = geo.attributes.position;
    const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vC = new THREE.Vector3();
    const centroid = new THREE.Vector3(), normal = new THREE.Vector3();
    const cb = new THREE.Vector3(), ab = new THREE.Vector3();
    const d20Numbers = [20, 1, 19, 2, 18, 3, 17, 4, 16, 5, 15, 6, 14, 7, 13, 8, 12, 9, 11, 10];

    for (let i = 0; i < 20; i++) {
      vA.fromBufferAttribute(posAttr, i * 3 + 0);
      vB.fromBufferAttribute(posAttr, i * 3 + 1);
      vC.fromBufferAttribute(posAttr, i * 3 + 2);

      centroid.copy(vA).add(vB).add(vC).divideScalar(3);
      cb.subVectors(vC, vB); ab.subVectors(vA, vB);
      normal.crossVectors(cb, ab).normalize();

      const numTex = this.createNumberTexture(d20Numbers[i]);
      const numMat = new THREE.MeshBasicMaterial({ map: numTex, transparent: true, depthWrite: false });
      const numPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), numMat);
      numPlane.position.copy(centroid).addScaledVector(normal, 0.005);
      numPlane.lookAt(centroid.clone().add(normal));
      d20Mesh.add(numPlane);
    }
    return d20Mesh;
  }

  private rollD20OnBoard(attacker: BoardUnit, defender: BoardUnit, chosenSpellType = 'melee'): void {
    const d20Mesh = this.createD20Mesh();
    const startX = attacker.root.position.x;
    const startZ = attacker.root.position.z;

    d20Mesh.position.set(startX, 2.8, startZ);
    this.scene.add(d20Mesh);

    const bodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(startX, 2.8, startZ);
    const body = this.world.createRigidBody(bodyDesc);
    this.world.createCollider(RAPIER.ColliderDesc.ball(0.38).setRestitution(0.65).setDensity(2.0), body);

    body.setLinvel({ x: (Math.random() - 0.5) * 5, y: 3.5, z: (Math.random() - 0.5) * 5 }, true);
    body.setAngvel({ x: Math.random() * 25, y: Math.random() * 25, z: Math.random() * 25 }, true);

    const d20Roll = Math.floor(Math.random() * 20) + 1;
    const totalAtk = d20Roll + attacker.stats.atkBonus;
    const isHit = totalAtk >= defender.stats.ca || d20Roll === 20;

    this.d20RollState = {
      mesh: d20Mesh, body, phase: 'rolling', timer: 0,
      rollDuration: 2.0, pauseDuration: 1.5,
      attacker, defender, chosenSpellType,
      d20Roll, totalAtk, isHit
    };

    this.statusText.set('🎲 LANCIO DEL d20 SULLA BOARD...');
  }

  // === 5. INCANTESIMI & ANIMAZIONE BRACCIO + ARMA ===
  private startWeaponAttackAnimation(attacker: BoardUnit, defender: BoardUnit, isHit: boolean, d20Roll: number, totalAtk: number): void {
    const attPos = attacker.root.position;
    const defPos = defender.root.position;

    const targetAngle = Math.atan2(defPos.x - attPos.x, defPos.z - attPos.z);
    attacker.root.rotation.y = targetAngle;

    const armGroup = attacker.armRGroup;
    const startRot = armGroup ? armGroup.rotation.clone() : new THREE.Euler();

    this.weaponAttackAnimState = {
      attacker, defender, armGroup,
      startRot, phase: 'slash', progress: 0,
      isHit, d20Roll, totalAtk
    };

    this.statusText.set(`⚔️ ${attacker.stats.name} sferra un colpo d'arma!`);
  }

  private castFireball(attacker: BoardUnit, defender: BoardUnit, isHit: boolean, d20Roll: number, totalAtk: number): void {
    const fireballGroup = new THREE.Group();
    const coreMesh = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 24), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
    const auraMesh = new THREE.Mesh(new THREE.SphereGeometry(0.85, 24, 24), new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.45 }));
    fireballGroup.add(coreMesh, auraMesh, new THREE.PointLight(0xff4500, 8, 12));

    const startPos = { x: attacker.root.position.x, y: 1.2, z: attacker.root.position.z };
    const targetPos = { x: defender.root.position.x, y: 1.2, z: defender.root.position.z };
    fireballGroup.position.set(startPos.x, startPos.y, startPos.z);
    this.scene.add(fireballGroup);

    this.fireballAnimState = { group: fireballGroup, attacker, defender, startPos, targetPos, progress: 0, isHit, d20Roll, totalAtk };
    this.statusText.set(`🔥 ${attacker.stats.name} lancia PALLA DI FUOCO!`);
  }

  private castLightningStorm(attacker: BoardUnit, defender: BoardUnit, isHit: boolean, d20Roll: number, totalAtk: number): void {
    const lightningGroup = new THREE.Group();
    const targetPos = defender.root.position;
    const boltMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const flashLight = new THREE.PointLight(0x0284c7, 15, 14);
    flashLight.position.set(targetPos.x, 3.5, targetPos.z);
    lightningGroup.add(flashLight);

    for (let b = 0; b < 4; b++) {
      const points: THREE.Vector3[] = [];
      let curX = targetPos.x + (Math.random() - 0.5) * 1.2;
      let curZ = targetPos.z + (Math.random() - 0.5) * 1.2;
      let curY = 9.0;
      points.push(new THREE.Vector3(curX, curY, curZ));

      while (curY > 0.2) {
        curY -= 0.8;
        curX += (Math.random() - 0.5) * 0.6;
        curZ += (Math.random() - 0.5) * 0.6;
        points.push(new THREE.Vector3(curX, curY, curZ));
      }

      lightningGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), boltMat));
    }

    this.scene.add(lightningGroup);
    this.lightningAnimState = { group: lightningGroup, attacker, defender, targetPos, timer: 0, duration: 1.0, isHit, d20Roll, totalAtk };
    this.statusText.set(`⚡ ${attacker.stats.name} invoca TEMPESTA DI FULMINI!`);
  }

  private castMagicMissile(attacker: BoardUnit, defender: BoardUnit, isHit: boolean, d20Roll: number, totalAtk: number): void {
    const missilesGroup = new THREE.Group();
    const startPos = { x: attacker.root.position.x, y: 1.1, z: attacker.root.position.z };
    const targetPos = { x: defender.root.position.x, y: 1.0, z: defender.root.position.z };

    const darts: any[] = [];
    const dartMat = new THREE.MeshBasicMaterial({ color: 0xe0e7ff });
    const auraMat = new THREE.MeshBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.6 });

    for (let i = 0; i < 3; i++) {
      const dartGroup = new THREE.Group();
      dartGroup.add(
        new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 12), dartMat),
        new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), auraMat),
        new THREE.PointLight(0xa855f7, 3, 5)
      );
      dartGroup.position.set(startPos.x, startPos.y, startPos.z);
      missilesGroup.add(dartGroup);

      darts.push({ group: dartGroup, curveDir: (i - 1) * 1.5, heightOffset: (i % 2 === 0 ? 0.8 : -0.3), delay: i * 0.15 });
    }

    this.scene.add(missilesGroup);
    this.missileAnimState = { group: missilesGroup, darts, attacker, defender, startPos, targetPos, progress: 0, isHit, d20Roll, totalAtk };
    this.statusText.set(`✨ ${attacker.stats.name} scaglia DARDO INCANTATO!`);
  }

  private triggerExplosion(pos: { x: number; y: number; z: number }, colorHex = 0xff3300): void {
    const expMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 24, 24),
      new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.9 })
    );
    expMesh.position.set(pos.x, pos.y, pos.z);
    expMesh.add(new THREE.PointLight(colorHex, 12, 15));
    this.scene.add(expMesh);
    this.activeExplosion = { mesh: expMesh, scale: 0.5, opacity: 0.9 };
  }

  private applyAttackDamage(attacker: BoardUnit, defender: BoardUnit, isHit: boolean, d20Roll: number, totalAtk: number): void {
    if (isHit) {
      const damage = Math.floor(Math.random() * (attacker.stats.dmgMax - attacker.stats.dmgMin + 1)) + attacker.stats.dmgMin;
      defender.stats.currentHp = Math.max(0, defender.stats.currentHp - damage);

      this.statusText.set(`🎲 Dado: ${d20Roll} (+${attacker.stats.atkBonus}) = ${totalAtk} vs CA ${defender.stats.ca} ➔ COLPITO! (${damage} Danni)`);

      if (defender.stats.currentHp <= 0 && !defender.isRagdoll) {
        defender.isRagdoll = true;
        this.world.removeRigidBody(defender.body);

        const pos = defender.root.position;
        const ragdollDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y + 0.2, pos.z);
        const ragdollBody = this.world.createRigidBody(ragdollDesc);
        this.world.createCollider(RAPIER.ColliderDesc.cuboid(0.3, 0.4, 0.3), ragdollBody);

        ragdollBody.applyImpulse({ x: (Math.random() - 0.5) * 8, y: 5.0, z: (Math.random() - 0.5) * 8 }, true);
        defender.body = ragdollBody;
      }
    } else {
      this.statusText.set(`🎲 Dado: ${d20Roll} (+${attacker.stats.atkBonus}) = ${totalAtk} vs CA ${defender.stats.ca} ➔ MANCATO!`);
    }
  }

  // === 6. INTERAZIONE RAYCASTER & SELEZIONE RING ===
  private bindPointerEvents(): void {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    window.addEventListener('pointerup', (e) => {
      if (this.movingUnit || this.fireballAnimState || this.lightningAnimState || this.missileAnimState || this.weaponAttackAnimState || this.d20RollState || this.isModalOpen()) return;

      const rect = this.canvasRef.nativeElement.getBoundingClientRect();
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
            this.isModalOpen.set(true);
            this.deselectUnit();
            return;
          }

          if (dist === 1 && this.selectedUnit.stats.isEnemy !== hitPiece.stats.isEnemy) {
            this.rollD20OnBoard(this.selectedUnit, hitPiece, 'melee');
            this.deselectUnit();
            return;
          }
        }

        this.selectUnit(hitPiece);
        return;
      }

      if (this.selectedUnit && hitTile) {
        const dist = Math.max(Math.abs(hitTile.x - this.selectedUnit.gridX), Math.abs(hitTile.z - this.selectedUnit.gridZ));
        if (!this.isCellOccupied(hitTile.x, hitTile.z) && dist <= this.selectedUnit.stats.speedMax) {
          this.startChessMovement(this.selectedUnit, hitTile.x, hitTile.z);
        }
      }
    });
  }

  private selectUnit(unit: BoardUnit): void {
    if (this.selectedUnit && this.selectedUnit !== unit) this.deselectUnit();
    this.selectedUnit = unit;

    // Posizionamento del segnale circolare sul terreno senza variare il colore della pedina
    const isDragon = unit.occupiedTiles.length > 1;
    const ringRadius = isDragon ? 2.2 : 1.0;
    this.selectionRing.scale.set(ringRadius, ringRadius, 1);
    this.selectionRing.position.set(unit.root.position.x, 0.09, unit.root.position.z);
    this.selectionRing.visible = true;

    this.selectedUnitStats.set(unit.stats);
    this.statusText.set(`${unit.stats.name}: Tocca una casella verde o un nemico ROSSO.`);
    this.updateHighlights(unit);
  }

  private deselectUnit(): void {
    if (!this.selectedUnit) return;
    this.selectedUnit = null;
    this.selectionRing.visible = false;
    this.clearHighlights();
    this.selectedUnitStats.set(null);
  }

  private getDistanceBetweenUnits(unitA: BoardUnit, unitB: BoardUnit): number {
    let minDist = Infinity;
    for (const tA of unitA.occupiedTiles) {
      for (const tB of unitB.occupiedTiles) {
        const dist = Math.max(Math.abs(tA.x - tB.x), Math.abs(tA.z - tB.z));
        if (dist < minDist) minDist = dist;
      }
    }
    return minDist;
  }

  private isCellOccupied(x: number, z: number): boolean {
    const hasPiece = this.units.some(u => u.stats.currentHp > 0 && u.occupiedTiles.some(t => t.x === x && t.z === z));
    const hasCrate = this.staticCrates.some(c => c.gridX === x && c.gridZ === z);
    const hasRock = this.staticRocks.some(r => r.gridX === x && r.gridZ === z);
    return hasPiece || hasCrate || hasRock;
  }

  private updateHighlights(selectedUnit: BoardUnit): void {
    this.clearHighlights();
    const hlGeo = new THREE.PlaneGeometry(this.tileSize * 0.94, this.tileSize * 0.94);
    hlGeo.rotateX(-Math.PI / 2);

    const hlMoveMat = new THREE.MeshStandardMaterial({
      color: 0x4ade80, emissive: 0x22c55e, emissiveIntensity: 0.8,
      transparent: true, opacity: 0.65, depthWrite: false
    });

    const hlAtkMat = new THREE.MeshStandardMaterial({
      color: 0xf87171, emissive: 0xef4444, emissiveIntensity: 0.8,
      transparent: true, opacity: 0.75, depthWrite: false
    });

    this.units.forEach(targetUnit => {
      if (targetUnit === selectedUnit || targetUnit.stats.currentHp <= 0) return;
      if (targetUnit.stats.isEnemy !== selectedUnit.stats.isEnemy) {
        const dist = this.getDistanceBetweenUnits(selectedUnit, targetUnit);
        if (dist === 1 || (selectedUnit.stats.isRanged && dist <= 6)) {
          targetUnit.occupiedTiles.forEach(tile => {
            const hl = new THREE.Mesh(hlGeo, hlAtkMat);
            const pos = this.get3DPosition(tile.x, tile.z);
            hl.position.set(pos.x, 0.12, pos.z);
            hl.userData = { isHighlight: true, gridX: tile.x, gridZ: tile.z };
            this.highlightGroup.add(hl);
          });
        }
      }
    });

    for (let x = 0; x < this.boardSize; x++) {
      for (let z = 0; z < this.boardSize; z++) {
        const dist = Math.max(Math.abs(x - selectedUnit.gridX), Math.abs(z - selectedUnit.gridZ));
        if (dist > 0 && dist <= selectedUnit.stats.speedMax && !this.isCellOccupied(x, z)) {
          const hl = new THREE.Mesh(hlGeo, hlMoveMat);
          const pos = this.get3DPosition(x, z);
          hl.position.set(pos.x, 0.12, pos.z);
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
      this.movePath.push({ gridX: currX, gridZ: currZ, pos3D: this.get3DPosition(currX, currZ) });
    }

    this.movingUnit = unit; this.currentPathIndex = 0; this.stepProgress = 0;
    this.statusText.set('Spostamento in corso...');
  }

  private get3DPosition(gridX: number, gridZ: number): { x: number; z: number } {
    return { x: gridX * this.tileSize - this.offset, z: gridZ * this.tileSize - this.offset };
  }

  // === 7. LOOP RENDER & ANIMAZIONI ===
  private animate(): void {
    this.animFrameId = requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();

    this.world.step();

    // d20 Roll
    if (this.d20RollState) {
      const st = this.d20RollState;
      st.timer += delta;

      if (st.phase === 'rolling') {
        const pos = st.body.translation(); const rot = st.body.rotation();
        st.mesh.position.set(pos.x, pos.y, pos.z); st.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);

        if (st.timer >= st.rollDuration) {
          st.phase = 'pause'; st.timer = 0;
          st.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
          st.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
          this.statusText.set(`🎲 Dado fermato su: ${st.d20Roll} (+${st.attacker.stats.atkBonus}) = ${st.totalAtk} vs CA ${st.defender.stats.ca}`);
        }
      } else if (st.phase === 'pause' && st.timer >= st.pauseDuration) {
        this.world.removeRigidBody(st.body);
        this.scene.remove(st.mesh);

        if (st.chosenSpellType === 'fireball') this.castFireball(st.attacker, st.defender, st.isHit, st.d20Roll, st.totalAtk);
        else if (st.chosenSpellType === 'lightning') this.castLightningStorm(st.attacker, st.defender, st.isHit, st.d20Roll, st.totalAtk);
        else if (st.chosenSpellType === 'missile') this.castMagicMissile(st.attacker, st.defender, st.isHit, st.d20Roll, st.totalAtk);
        else this.startWeaponAttackAnimation(st.attacker, st.defender, st.isHit, st.d20Roll, st.totalAtk);

        this.d20RollState = null;
      }
    }

    // Animazione Attacco Braccio + Arma
    if (this.weaponAttackAnimState) {
      const st = this.weaponAttackAnimState;

      if (st.armGroup) {
        st.progress += delta * 7.0;
        const p = Math.min(st.progress, 1);

        if (st.phase === 'slash') {
          st.armGroup.rotation.x = THREE.MathUtils.lerp(st.startRot.x, st.startRot.x - Math.PI * 0.55, Math.sin(p * Math.PI));

          if (st.progress >= 1) {
            st.phase = 'return';
            st.progress = 0;

            const hitWorldPos = new THREE.Vector3();
            st.armGroup.getWorldPosition(hitWorldPos);
            this.triggerExplosion(hitWorldPos, st.isHit ? 0xfbcfe8 : 0x64748b);
            this.applyAttackDamage(st.attacker, st.defender, st.isHit, st.d20Roll, st.totalAtk);
          }
        } else if (st.phase === 'return') {
          st.armGroup.rotation.x = THREE.MathUtils.lerp(st.armGroup.rotation.x, st.startRot.x, p);

          if (st.progress >= 1) {
            st.armGroup.rotation.copy(st.startRot);
            this.weaponAttackAnimState = null;
          }
        }
      } else {
        this.applyAttackDamage(st.attacker, st.defender, st.isHit, st.d20Roll, st.totalAtk);
        this.weaponAttackAnimState = null;
      }
    }

    // Volo Palla di Fuoco
    if (this.fireballAnimState) {
      const st = this.fireballAnimState;
      st.progress += delta * 0.8;
      st.group.position.x = THREE.MathUtils.lerp(st.startPos.x, st.targetPos.x, Math.min(st.progress, 1));
      st.group.position.y = THREE.MathUtils.lerp(st.startPos.y, st.targetPos.y, Math.min(st.progress, 1)) + Math.sin(Math.min(st.progress, 1) * Math.PI) * 0.6;
      st.group.position.z = THREE.MathUtils.lerp(st.startPos.z, st.targetPos.z, Math.min(st.progress, 1));

      if (st.progress >= 1) {
        this.triggerExplosion(st.targetPos, 0xff3300);
        this.applyAttackDamage(st.attacker, st.defender, st.isHit, st.d20Roll, st.totalAtk);
        this.scene.remove(st.group);
        this.fireballAnimState = null;
      }
    }

    // Tempesta di Fulmini
    if (this.lightningAnimState) {
      const st = this.lightningAnimState;
      st.timer += delta;
      st.group.visible = Math.random() > 0.2;

      if (st.timer >= st.duration) {
        this.triggerExplosion(st.targetPos, 0x0284c7);
        this.applyAttackDamage(st.attacker, st.defender, st.isHit, st.d20Roll, st.totalAtk);
        this.scene.remove(st.group);
        this.lightningAnimState = null;
      }
    }

    // Dardo Incantato
    if (this.missileAnimState) {
      const st = this.missileAnimState;
      st.progress += delta * 0.9;

      st.darts.forEach((dart: any) => {
        const p = Math.max(0, Math.min(st.progress - dart.delay, 1));
        if (p > 0) {
          const lerpX = THREE.MathUtils.lerp(st.startPos.x, st.targetPos.x, p);
          const lerpY = THREE.MathUtils.lerp(st.startPos.y, st.targetPos.y, p);
          const lerpZ = THREE.MathUtils.lerp(st.startPos.z, st.targetPos.z, p);
          const curveFactor = Math.sin(p * Math.PI);
          dart.group.position.x = lerpX + dart.curveDir * curveFactor;
          dart.group.position.y = lerpY + dart.heightOffset * curveFactor;
          dart.group.position.z = lerpZ;
        }
      });

      if (st.progress >= 1.3) {
        this.triggerExplosion(st.targetPos, 0xa855f7);
        this.applyAttackDamage(st.attacker, st.defender, st.isHit, st.d20Roll, st.totalAtk);
        this.scene.remove(st.group);
        this.missileAnimState = null;
      }
    }

    // Esplosione
    if (this.activeExplosion) {
      const exp = this.activeExplosion;
      exp.scale += delta * 10;
      exp.opacity -= delta * 1.5;
      exp.mesh.scale.set(exp.scale, exp.scale, exp.scale);
      exp.mesh.material.opacity = Math.max(0, exp.opacity);

      if (exp.opacity <= 0) {
        this.scene.remove(exp.mesh);
        this.activeExplosion = null;
      }
    }

    // Movimento a Scacchiera con Rotazione
    if (this.movingUnit && this.movePath.length > 0) {
      this.stepProgress += delta * this.stepSpeed;
      const currentStep = this.movePath[this.currentPathIndex];
      const startPos = this.currentPathIndex === 0
        ? this.get3DPosition(this.movingUnit.gridX, this.movingUnit.gridZ)
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
        this.movingUnit.occupiedTiles = [{ x: currentStep.gridX, z: currentStep.gridZ }];
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

    // Sincronizzazione Kinematic / Ragdoll
    this.units.forEach(u => {
      if (u.isRagdoll) {
        const pos = u.body.translation(); const rot = u.body.rotation();
        u.root.position.set(pos.x, pos.y, pos.z); u.root.quaternion.set(rot.x, rot.y, rot.z, rot.w);
      } else {
        u.body.setNextKinematicTranslation(u.root.position);
      }
    });

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}