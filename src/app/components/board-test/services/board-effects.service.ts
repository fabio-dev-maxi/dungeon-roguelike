import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { BoardUnit } from '../models/board-types';
import { BoardPhysicsService } from './board-physics.service';

interface FloatingText {
  sprite: THREE.Sprite;
  timer: number;
  maxDuration: number;
}

@Injectable({
  providedIn: 'root'
})
export class BoardEffectsService {
  private scene!: THREE.Scene;
  private floatingTexts: FloatingText[] = [];

  private d20RollState: any = null;
  private fireballAnimState: any = null;
  private lightningAnimState: any = null;
  private missileAnimState: any = null;
  private weaponAttackAnimState: any = null;
  private arrowAnimState: any = null;
  private harmAnimState: any = null;
  private activeExplosion: any = null;

  constructor(private physics: BoardPhysicsService) { }

  public initEffects(scene: THREE.Scene): void {
    this.scene = scene;
  }

  // === DADO d20 ===
  public rollD20OnBoard(
    attacker: BoardUnit,
    defender: BoardUnit,
    chosenSpellType = 'melee',
    onStatusUpdate: (msg: string) => void
  ): void {
    const d20Mesh = this.createD20Mesh();
    const startX = attacker.root.position.x;
    const startZ = attacker.root.position.z;

    d20Mesh.position.set(startX, 2.8, startZ);
    this.scene.add(d20Mesh);

    const body = this.physics.createDynamicBallBody(startX, 2.8, startZ);
    if (!body) return;

    body.setLinvel({ x: (Math.random() - 0.5) * 5, y: 3.5, z: (Math.random() - 0.5) * 5 }, true);
    body.setAngvel({ x: Math.random() * 25, y: Math.random() * 25, z: Math.random() * 25 }, true);

    const d20Roll = Math.floor(Math.random() * 20) + 1;
    const totalAtk = d20Roll + attacker.stats.atkBonus;
    const isHit = totalAtk >= defender.stats.ca || d20Roll === 20;

    this.d20RollState = {
      mesh: d20Mesh, body, phase: 'rolling', timer: 0,
      rollDuration: 2.0, pauseDuration: 1.5,
      attacker, defender, chosenSpellType,
      d20Roll, totalAtk, isHit, onStatusUpdate
    };

    onStatusUpdate('🎲 LANCIO DEL d20 SULLA BOARD...');
  }

  private createD20Mesh(): THREE.Mesh {
    const rawGeo = new THREE.IcosahedronGeometry(0.38, 0);
    const geo = rawGeo.toNonIndexed();
    const mat = new THREE.MeshStandardMaterial({ color: 0x581c87, roughness: 0.25, metalness: 0.5, flatShading: true });
    const d20Mesh = new THREE.Mesh(geo, mat);
    d20Mesh.castShadow = true;

    const posAttr = geo.attributes['position'];
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

  private getD20FaceQuaternion(rolledNum: number): THREE.Quaternion {
    const rawGeo = new THREE.IcosahedronGeometry(0.38, 0);
    const geo = rawGeo.toNonIndexed();
    const posAttr = geo.attributes['position'];
    const d20Numbers = [20, 1, 19, 2, 18, 3, 17, 4, 16, 5, 15, 6, 14, 7, 13, 8, 12, 9, 11, 10];
    const faceIndex = d20Numbers.indexOf(rolledNum);
    if (faceIndex === -1) return new THREE.Quaternion();

    const vA = new THREE.Vector3().fromBufferAttribute(posAttr, faceIndex * 3 + 0);
    const vB = new THREE.Vector3().fromBufferAttribute(posAttr, faceIndex * 3 + 1);
    const vC = new THREE.Vector3().fromBufferAttribute(posAttr, faceIndex * 3 + 2);

    const cb = new THREE.Vector3().subVectors(vC, vB);
    const ab = new THREE.Vector3().subVectors(vA, vB);
    const normal = new THREE.Vector3().crossVectors(cb, ab).normalize();

    const q = new THREE.Quaternion();
    q.setFromUnitVectors(normal, new THREE.Vector3(0, 1, 0));
    return q;
  }

  // === TIRO CON L'ARCO (GOBLIN ARCIERE) ===
  public shootArrow(attacker: BoardUnit, defender: BoardUnit, isHit: boolean, d20Roll: number, totalAtk: number, onStatusUpdate: (msg: string) => void): void {
    const arrowGroup = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 8), new THREE.MeshStandardMaterial({ color: 0x78350f }));
    shaft.rotation.x = Math.PI / 2;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 4), new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.8 }));
    tip.position.z = 0.35;
    tip.rotation.x = Math.PI / 2;
    arrowGroup.add(shaft, tip);

    const startPos = { x: attacker.root.position.x, y: 0.8, z: attacker.root.position.z };
    const targetPos = { x: defender.root.position.x, y: 0.8, z: defender.root.position.z };
    arrowGroup.position.set(startPos.x, startPos.y, startPos.z);
    this.scene.add(arrowGroup);

    this.arrowAnimState = {
      group: arrowGroup, attacker, defender, startPos, targetPos,
      progress: 0, isHit, d20Roll, totalAtk, onStatusUpdate
    };

    onStatusUpdate(`🏹 ${attacker.stats.name} scaglia una freccia!`);
  }

  // === MAGIE DEL CHIERICO ===
  public castCuraFeriteLeggere(caster: BoardUnit, target: BoardUnit, d20Roll: number, onStatusUpdate: (msg: string) => void): void {
    const healAmount = Math.floor(Math.random() * 8) + 1 + 3; // 1d8 + 3
    target.stats.currentHp = Math.min(target.stats.maxHp, target.stats.currentHp + healAmount);

    const textPos = target.root.position.clone();
    textPos.y += 1.6;

    this.spawnDamageText(textPos, `+${healAmount}`, '#22c55e');

    const auraMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.6, 1.8, 16),
      new THREE.MeshBasicMaterial({ color: 0x86efac, transparent: true, opacity: 0.5 })
    );
    auraMesh.position.copy(target.root.position);
    this.scene.add(auraMesh);

    setTimeout(() => this.scene.remove(auraMesh), 600);
    onStatusUpdate(`🎲 Dado: ${d20Roll} ➔ ✨ ${caster.stats.name} lancia Cura Ferite Leggere su ${target.stats.name} (+${healAmount} PV)`);
  }

  public castInfliggiFeriteLeggere(
    attacker: BoardUnit,
    defender: BoardUnit,
    isHit: boolean,
    d20Roll: number,
    totalAtk: number,
    onStatusUpdate: (msg: string) => void
  ): void {
    const startPos = attacker.root.position.clone();
    startPos.y += 0.8;
    const targetPos = defender.root.position.clone();
    targetPos.y += 0.8;

    const distance = startPos.distanceTo(targetPos);
    const beamGeo = new THREE.CylinderGeometry(0.08, 0.08, distance, 12);
    beamGeo.rotateX(Math.PI / 2);

    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.95
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);

    const redLight = new THREE.PointLight(0xdc2626, 12, distance * 1.5);
    beamMesh.add(redLight);

    beamMesh.position.copy(startPos).add(targetPos).multiplyScalar(0.5);
    beamMesh.lookAt(targetPos);

    this.scene.add(beamMesh);

    this.harmAnimState = {
      mesh: beamMesh,
      attacker,
      defender,
      targetPos,
      timer: 0,
      duration: 0.45,
      isHit,
      d20Roll,
      totalAtk,
      onStatusUpdate
    };

    onStatusUpdate(`💀 ${attacker.stats.name} lancia INFLIGGI FERITE LEGGERE!`);
  }

  // === ALTRE MAGIE E ATTACCHI ===
  public startWeaponAttackAnimation(attacker: BoardUnit, defender: BoardUnit, isHit: boolean, d20Roll: number, totalAtk: number, onStatusUpdate: (msg: string) => void): void {
    const attPos = attacker.root.position;
    const defPos = defender.root.position;

    attacker.root.rotation.y = Math.atan2(defPos.x - attPos.x, defPos.z - attPos.z);
    const armGroup = attacker.armRGroup;
    const startRot = armGroup ? armGroup.rotation.clone() : new THREE.Euler();

    this.weaponAttackAnimState = {
      attacker, defender, armGroup,
      startRot, phase: 'slash', progress: 0,
      isHit, d20Roll, totalAtk, onStatusUpdate
    };
    onStatusUpdate(`⚔️ ${attacker.stats.name} sferra un colpo d'arma!`);
  }

  public castFireball(attacker: BoardUnit, defender: BoardUnit, isHit: boolean, d20Roll: number, totalAtk: number, onStatusUpdate: (msg: string) => void): void {
    const fireballGroup = new THREE.Group();
    const coreMesh = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 24), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
    const auraMesh = new THREE.Mesh(new THREE.SphereGeometry(0.85, 24, 24), new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.45 }));
    fireballGroup.add(coreMesh, auraMesh, new THREE.PointLight(0xff4500, 8, 12));

    const startPos = { x: attacker.root.position.x, y: 1.2, z: attacker.root.position.z };
    const targetPos = { x: defender.root.position.x, y: 1.2, z: defender.root.position.z };
    fireballGroup.position.set(startPos.x, startPos.y, startPos.z);
    this.scene.add(fireballGroup);

    this.fireballAnimState = { group: fireballGroup, attacker, defender, startPos, targetPos, progress: 0, isHit, d20Roll, totalAtk, onStatusUpdate };
    onStatusUpdate(`🔥 ${attacker.stats.name} lancia PALLA DI FUOCO!`);
  }

  public castLightningStorm(attacker: BoardUnit, defender: BoardUnit, isHit: boolean, d20Roll: number, totalAtk: number, onStatusUpdate: (msg: string) => void): void {
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
        curY -= 0.8; curX += (Math.random() - 0.5) * 0.6; curZ += (Math.random() - 0.5) * 0.6;
        points.push(new THREE.Vector3(curX, curY, curZ));
      }
      lightningGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), boltMat));
    }

    this.scene.add(lightningGroup);
    this.lightningAnimState = { group: lightningGroup, attacker, defender, targetPos, timer: 0, duration: 1.0, isHit, d20Roll, totalAtk, onStatusUpdate };
    onStatusUpdate(`⚡ ${attacker.stats.name} invoca TEMPESTA DI FULMINI!`);
  }

  public castMagicMissile(attacker: BoardUnit, defender: BoardUnit, isHit: boolean, d20Roll: number, totalAtk: number, onStatusUpdate: (msg: string) => void): void {
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
    this.missileAnimState = { group: missilesGroup, darts, attacker, defender, startPos, targetPos, progress: 0, isHit, d20Roll, totalAtk, onStatusUpdate };
    onStatusUpdate(`✨ ${attacker.stats.name} scaglia DARDO INCANTATO!`);
  }

  public triggerExplosion(pos: { x: number; y: number; z: number }, colorHex = 0xff3300): void {
    const expMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 24, 24),
      new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.9 })
    );
    expMesh.position.set(pos.x, pos.y, pos.z);
    expMesh.add(new THREE.PointLight(colorHex, 12, 15));
    this.scene.add(expMesh);
    this.activeExplosion = { mesh: expMesh, scale: 0.5, opacity: 0.9 };
  }

  public spawnDamageText(position: THREE.Vector3, text: string, colorHex: string): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.font = 'bold 80px "Georgia", serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000000'; ctx.lineWidth = 14;
    ctx.strokeText(text, 256, 128);
    ctx.fillStyle = colorHex;
    ctx.fillText(text, 256, 128);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);

    sprite.position.copy(position);
    sprite.scale.set(2.4, 1.2, 1);

    this.scene.add(sprite);
    this.floatingTexts.push({ sprite, timer: 0, maxDuration: 1.2 });
  }

  private applyAttackDamage(
    attacker: BoardUnit,
    defender: BoardUnit,
    isHit: boolean,
    d20Roll: number,
    totalAtk: number,
    onStatusUpdate: (msg: string) => void
  ): void {
    const textPos = defender.root.position.clone();
    textPos.y += 1.6;

    if (isHit) {
      const damage = Math.floor(Math.random() * (attacker.stats.dmgMax - attacker.stats.dmgMin + 1)) + attacker.stats.dmgMin;
      defender.stats.currentHp = Math.max(0, defender.stats.currentHp - damage);

      this.spawnDamageText(textPos, `-${damage}`, '#ef4444');
      onStatusUpdate(`🎲 Dado: ${d20Roll} (+${attacker.stats.atkBonus}) = ${totalAtk} vs CA ${defender.stats.ca} ➔ COLPITO! (${damage} Danni)`);

      if (defender.stats.currentHp <= 0 && !defender.isRagdoll) {
        this.physics.convertToRagdoll(defender);
      }
    } else {
      this.spawnDamageText(textPos, 'MANCATO', '#94a3b8');
      onStatusUpdate(`🎲 Dado: ${d20Roll} (+${attacker.stats.atkBonus}) = ${totalAtk} vs CA ${defender.stats.ca} ➔ MANCATO!`);
    }
  }

  public updateEffects(delta: number): void {
    if (this.d20RollState) {
      const st = this.d20RollState;
      st.timer += delta;

      if (st.phase === 'rolling') {
        const pos = st.body.translation();
        const rot = st.body.rotation();
        st.mesh.position.set(pos.x, pos.y, pos.z);
        st.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);

        if (st.timer >= st.rollDuration) {
          st.phase = 'pause';
          st.timer = 0;
          st.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
          st.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
          st.mesh.quaternion.copy(this.getD20FaceQuaternion(st.d20Roll));
          st.onStatusUpdate(`🎲 Dado fermato su: ${st.d20Roll} (+${st.attacker.stats.atkBonus}) = ${st.totalAtk} vs CA ${st.defender.stats.ca}`);
        }
      } else if (st.phase === 'pause' && st.timer >= st.pauseDuration) {
        this.physics.removeRigidBody(st.body);
        this.scene.remove(st.mesh);

        if (st.chosenSpellType === 'fireball') {
          this.castFireball(st.attacker, st.defender, st.isHit, st.d20Roll, st.totalAtk, st.onStatusUpdate);
        } else if (st.chosenSpellType === 'lightning') {
          this.castLightningStorm(st.attacker, st.defender, st.isHit, st.d20Roll, st.totalAtk, st.onStatusUpdate);
        } else if (st.chosenSpellType === 'missile') {
          this.castMagicMissile(st.attacker, st.defender, st.isHit, st.d20Roll, st.totalAtk, st.onStatusUpdate);
        } else if (st.chosenSpellType === 'cleric_harm') {
          this.castInfliggiFeriteLeggere(st.attacker, st.defender, st.isHit, st.d20Roll, st.totalAtk, st.onStatusUpdate);
        } else if (st.chosenSpellType === 'cure') {
          this.castCuraFeriteLeggere(st.attacker, st.defender, st.d20Roll, st.onStatusUpdate);
        } else if (st.chosenSpellType === 'arrow') {
          this.shootArrow(st.attacker, st.defender, st.isHit, st.d20Roll, st.totalAtk, st.onStatusUpdate);
        } else {
          this.startWeaponAttackAnimation(st.attacker, st.defender, st.isHit, st.d20Roll, st.totalAtk, st.onStatusUpdate);
        }

        this.d20RollState = null;
      }
    }

    if (this.harmAnimState) {
      const st = this.harmAnimState;
      st.timer += delta;
      const progress = st.timer / st.duration;

      st.mesh.material.opacity = Math.max(0, 1 - progress);
      st.mesh.scale.set(1 + Math.sin(progress * Math.PI) * 0.5, 1, 1 + Math.sin(progress * Math.PI) * 0.5);

      if (st.timer >= st.duration) {
        this.triggerExplosion(st.targetPos, 0xdc2626);
        this.applyAttackDamage(st.attacker, st.defender, st.isHit, st.d20Roll, st.totalAtk, st.onStatusUpdate);

        this.scene.remove(st.mesh);
        st.mesh.geometry.dispose();
        st.mesh.material.dispose();
        this.harmAnimState = null;
      }
    }

    if (this.arrowAnimState) {
      const st = this.arrowAnimState;
      st.progress += delta * 2.5;
      const p = Math.min(st.progress, 1);
      st.group.position.x = THREE.MathUtils.lerp(st.startPos.x, st.targetPos.x, p);
      st.group.position.y = THREE.MathUtils.lerp(st.startPos.y, st.targetPos.y, p) + Math.sin(p * Math.PI) * 0.4;
      st.group.position.z = THREE.MathUtils.lerp(st.startPos.z, st.targetPos.z, p);
      st.group.lookAt(st.targetPos.x, st.targetPos.y, st.targetPos.z);

      if (st.progress >= 1) {
        this.applyAttackDamage(st.attacker, st.defender, st.isHit, st.d20Roll, st.totalAtk, st.onStatusUpdate);
        this.scene.remove(st.group);
        this.arrowAnimState = null;
      }
    }

    if (this.weaponAttackAnimState) {
      const st = this.weaponAttackAnimState;
      if (st.armGroup) {
        st.progress += delta * 7.0;
        const p = Math.min(st.progress, 1);
        if (st.phase === 'slash') {
          st.armGroup.rotation.x = THREE.MathUtils.lerp(st.startRot.x, st.startRot.x - Math.PI * 0.55, Math.sin(p * Math.PI));
          if (st.progress >= 1) {
            st.phase = 'return'; st.progress = 0;
            this.applyAttackDamage(st.attacker, st.defender, st.isHit, st.d20Roll, st.totalAtk, st.onStatusUpdate);
          }
        } else if (st.phase === 'return') {
          st.armGroup.rotation.x = THREE.MathUtils.lerp(st.armGroup.rotation.x, st.startRot.x, p);
          if (st.progress >= 1) {
            st.armGroup.rotation.copy(st.startRot);
            this.weaponAttackAnimState = null;
          }
        }
      } else {
        this.applyAttackDamage(st.attacker, st.defender, st.isHit, st.d20Roll, st.totalAtk, st.onStatusUpdate);
        this.weaponAttackAnimState = null;
      }
    }

    if (this.fireballAnimState) {
      const st = this.fireballAnimState;
      st.progress += delta * 0.8;
      st.group.position.x = THREE.MathUtils.lerp(st.startPos.x, st.targetPos.x, Math.min(st.progress, 1));
      st.group.position.y = THREE.MathUtils.lerp(st.startPos.y, st.targetPos.y, Math.min(st.progress, 1)) + Math.sin(Math.min(st.progress, 1) * Math.PI) * 0.6;
      st.group.position.z = THREE.MathUtils.lerp(st.startPos.z, st.targetPos.z, Math.min(st.progress, 1));
      if (st.progress >= 1) {
        this.triggerExplosion(st.targetPos, 0xff3300);
        this.applyAttackDamage(st.attacker, st.defender, st.isHit, st.d20Roll, st.totalAtk, st.onStatusUpdate);
        this.scene.remove(st.group);
        this.fireballAnimState = null;
      }
    }

    if (this.lightningAnimState) {
      const st = this.lightningAnimState;
      st.timer += delta;
      st.group.visible = Math.random() > 0.2;
      if (st.timer >= st.duration) {
        this.triggerExplosion(st.targetPos, 0x0284c7);
        this.applyAttackDamage(st.attacker, st.defender, st.isHit, st.d20Roll, st.totalAtk, st.onStatusUpdate);
        this.scene.remove(st.group);
        this.lightningAnimState = null;
      }
    }

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
        this.applyAttackDamage(st.attacker, st.defender, st.isHit, st.d20Roll, st.totalAtk, st.onStatusUpdate);
        this.scene.remove(st.group);
        this.missileAnimState = null;
      }
    }

    if (this.activeExplosion) {
      const exp = this.activeExplosion;
      exp.scale += delta * 10; exp.opacity -= delta * 1.5;
      exp.mesh.scale.set(exp.scale, exp.scale, exp.scale);
      exp.mesh.material.opacity = Math.max(0, exp.opacity);
      if (exp.opacity <= 0) { this.scene.remove(exp.mesh); this.activeExplosion = null; }
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.timer += delta;
      ft.sprite.position.y += delta * 1.1;
      ft.sprite.material.opacity = Math.max(0, 1 - ft.timer / ft.maxDuration);
      if (ft.timer >= ft.maxDuration) {
        this.scene.remove(ft.sprite);
        ft.sprite.material.map?.dispose();
        ft.sprite.material.dispose();
        this.floatingTexts.splice(i, 1);
      }
    }
  }
}