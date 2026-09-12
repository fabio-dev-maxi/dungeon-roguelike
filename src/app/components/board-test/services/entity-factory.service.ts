import { Injectable } from '@angular/core';
import * as THREE from 'three';

export interface EntityMeshResult {
  group: THREE.Group;
  torsoMesh: THREE.Mesh;
  armRGroup?: THREE.Group;
}

@Injectable({
  providedIn: 'root'
})
export class EntityFactoryService {
  private steelMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.8, roughness: 0.2 });
  private woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
  private goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7, roughness: 0.3 });
  private darkLeatherMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.8 });
  private skinMat = new THREE.MeshStandardMaterial({ color: 0xffdbac });
  private bootMat = new THREE.MeshStandardMaterial({ color: 0x1e1b18 });

  // === ARMI EROI ===
  createSword(): THREE.Group {
    const sword = new THREE.Group();
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3), this.woodMat);
    hilt.position.set(0, -0.2, 0.15);
    hilt.rotation.x = Math.PI / 4;

    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.06), this.steelMat);
    guard.position.set(0, -0.1, 0.25);
    guard.rotation.x = Math.PI / 4;

    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.9, 0.02), this.steelMat);
    blade.position.set(0, 0.25, 0.55);
    blade.rotation.x = Math.PI / 4;
    blade.castShadow = true;

    sword.add(hilt, guard, blade);
    return sword;
  }

  createStaff(): THREE.Group {
    const staff = new THREE.Group();
    const staffBody = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 8), this.woodMat);
    staffBody.position.set(0, -0.2, 0.2);
    staffBody.castShadow = true;

    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x60a5fa })
    );
    orb.position.set(0, 0.5, 0.2);

    staff.add(staffBody, orb);
    return staff;
  }

  createDaggers(): THREE.Group {
    const daggers = new THREE.Group();
    const dHilt = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12), this.woodMat);
    dHilt.position.set(0, -0.25, 0.12);
    dHilt.rotation.x = Math.PI / 3;

    const dBlade = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.3, 0.015), this.steelMat);
    dBlade.position.set(0, -0.1, 0.24);
    dBlade.rotation.x = Math.PI / 3;
    dBlade.castShadow = true;

    daggers.add(dHilt, dBlade);
    return daggers;
  }

  createFlail(): THREE.Group {
    const flail = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.45), this.woodMat);
    handle.position.set(0, -0.2, 0.1);
    handle.rotation.x = Math.PI / 6;

    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.18), this.steelMat);
    chain.position.set(0, -0.05, 0.22);
    chain.rotation.x = Math.PI / 4;

    const ball = new THREE.Mesh(new THREE.DodecahedronGeometry(0.1, 0), this.steelMat);
    ball.position.set(0, 0.05, 0.32);
    ball.castShadow = true;

    flail.add(handle, chain, ball);
    return flail;
  }

  // === ARMI GOBLIN (POSIZIONATE IN MANO SENZA FLUTTUARE) ===

  createGoblinSpear(): THREE.Group {
    const spear = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.1, 8), this.woodMat);
    shaft.position.y = 0.35;
    shaft.castShadow = true;

    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.25, 4), this.steelMat);
    tip.position.y = 0.95;
    tip.castShadow = true;

    spear.add(shaft, tip);
    spear.position.set(0, -0.22, 0.05); // Posizione relativa alla mano
    spear.rotation.x = Math.PI / 4;
    return spear;
  }

  createGoblinBow(): THREE.Group {
    const bowGroup = new THREE.Group();
    const arcGeo = new THREE.TorusGeometry(0.32, 0.018, 8, 16, Math.PI);
    const bowWood = new THREE.Mesh(arcGeo, this.woodMat);
    bowWood.rotation.y = Math.PI / 2;
    bowWood.castShadow = true;

    const points = [new THREE.Vector3(0, 0.32, 0), new THREE.Vector3(0, -0.32, 0)];
    const stringGeo = new THREE.BufferGeometry().setFromPoints(points);
    const stringMat = new THREE.LineBasicMaterial({ color: 0xe2e8f0 });
    const bowString = new THREE.Line(stringGeo, stringMat);

    bowGroup.add(bowWood, bowString);
    bowGroup.position.set(0, -0.22, 0.1); // Posizione relativa alla mano
    bowGroup.rotation.y = Math.PI / 6;
    return bowGroup;
  }

  // === EROI & UMANOIDI ===

  createHumanMesh(colorHex: number, classType: 'warrior' | 'mage' | 'rogue' | 'cleric' = 'warrior'): EntityMeshResult {
    const group = new THREE.Group();
    const armorMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.4 });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.4, 0.06, 16), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
    base.position.y = 0.03; base.receiveShadow = true; group.add(base);

    const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.4, 10);
    const legL = new THREE.Mesh(legGeo, this.bootMat); legL.position.set(-0.1, 0.26, 0); legL.castShadow = true;
    const legR = new THREE.Mesh(legGeo, this.bootMat); legR.position.set(0.1, 0.26, 0); legR.castShadow = true;
    group.add(legL, legR);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.45, 0.22), armorMat);
    torso.position.y = 0.685; torso.castShadow = true; group.add(torso);

    const armGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.38, 10);
    const armL = new THREE.Mesh(armGeo, armorMat); armL.position.set(-0.21, 0.65, 0); armL.castShadow = true;
    group.add(armL);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), this.skinMat);
    head.position.y = 1.05; head.castShadow = true; group.add(head);

    const armRGroup = new THREE.Group();
    armRGroup.position.set(0.21, 0.80, 0);

    const armRMesh = new THREE.Mesh(armGeo, armorMat);
    armRMesh.position.set(0, -0.15, 0);
    armRGroup.add(armRMesh);

    if (classType === 'mage') {
      const hat = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 12), armorMat);
      hat.position.y = 1.3; hat.castShadow = true; group.add(hat);
      armRGroup.add(this.createStaff());
    } else if (classType === 'warrior') {
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12, 0, Math.PI * 2, 0, Math.PI / 1.8), this.steelMat);
      helmet.position.y = 1.06; helmet.castShadow = true;
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.08), this.steelMat);
      visor.position.set(0, 1.06, 0.1); visor.castShadow = true;
      group.add(helmet, visor);
      armRGroup.add(this.createSword());
    } else if (classType === 'rogue') {
      const hood = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12, 0, Math.PI * 2, 0, Math.PI / 1.5), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }));
      hood.position.y = 1.07; hood.castShadow = true; group.add(hood);
      armRGroup.add(this.createDaggers());
    } else if (classType === 'cleric') {
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 12), this.goldMat);
      crown.position.y = 1.15; crown.castShadow = true; group.add(crown);

      const shieldGroup = new THREE.Group();
      const shieldBody = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.04, 6), this.steelMat); shieldBody.rotation.x = Math.PI / 2; shieldBody.castShadow = true;
      const emblem = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.02), this.goldMat); emblem.position.z = 0.03;
      shieldGroup.add(shieldBody, emblem);
      shieldGroup.position.set(-0.26, 0.65, 0.1);
      group.add(shieldGroup);

      armRGroup.add(this.createFlail());
    }

    group.add(armRGroup);
    return { group, torsoMesh: torso, armRGroup };
  }

  // === GOBLIN ===

  createGoblinMesh(colorHex: number, isRanged = false): EntityMeshResult {
    const group = new THREE.Group();
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5 });
    const redEyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.05, 12), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
    base.position.y = 0.025; base.receiveShadow = true; group.add(base);

    const legGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.28, 8);
    const legL = new THREE.Mesh(legGeo, this.darkLeatherMat); legL.position.set(-0.08, 0.18, 0); legL.castShadow = true;
    const legR = new THREE.Mesh(legGeo, this.darkLeatherMat); legR.position.set(0.08, 0.18, 0); legR.castShadow = true;
    group.add(legL, legR);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.18), this.darkLeatherMat);
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

    // Snodo della spalla destra
    const armRGroup = new THREE.Group();
    armRGroup.position.set(0.15, 0.52, 0);
    const armRMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.26), greenMat);
    armRMesh.position.set(0, -0.11, 0);
    armRGroup.add(armRMesh);

    // Assegna l'arma corretta montata sulla mano
    const weapon = isRanged ? this.createGoblinBow() : this.createGoblinSpear();
    armRGroup.add(weapon);

    group.add(armRGroup);
    return { group, torsoMesh: torso, armRGroup };
  }

  // === DRAGO ROSSO 2x2 ===

  createDragonMesh(tileSize: number): EntityMeshResult {
    const group = new THREE.Group();
    const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
    const darkRedMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.5 });
    const goldBellyMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.3 });
    const yellowEyeMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });

    const baseSize = tileSize * 2 - 0.14;
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

    const upperJaw = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.45, 1.0), redMat); upperJaw.position.set(0, 0.45, -0.6); upperJaw.castShadow = true;
    const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.22, 0.85), darkRedMat); lowerJaw.position.set(0, 0.18, -0.55); lowerJaw.castShadow = true;
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
}