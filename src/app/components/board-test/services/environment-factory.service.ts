import { Injectable } from '@angular/core';
import * as THREE from 'three';

@Injectable({
  providedIn: 'root'
})
export class EnvironmentFactoryService {

  // === MATERIALI BASE A TINTA UNITA (ZERO TEXTURE ESTERNE) ===

  public createFloorTileMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0x2b221a,
      roughness: 0.8,
      metalness: 0.1
    });
  }

  public createWallMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0x18120c,
      roughness: 0.9,
      metalness: 0.05
    });
  }

  public createCrateMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.7,
      metalness: 0.1
    });
  }

  public createCrystalMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.8,
      roughness: 0.2
    });
  }

  public createShieldMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.8,
      roughness: 0.3
    });
  }

  // === CREAZIONE PROPS E ELEMENTI 3D ===

  public createFloorMesh(totalBoardWidth: number, wallThickness: number): THREE.Mesh {
    const outerSize = totalBoardWidth + wallThickness * 2;
    const floorGeo = new THREE.BoxGeometry(outerSize, 0.2, outerSize);
    const floorMesh = new THREE.Mesh(floorGeo, this.createWallMaterial());
    floorMesh.position.set(0, -0.1, 0);
    floorMesh.receiveShadow = true;
    return floorMesh;
  }

  public createTilesGroup(boardSize: number, tileSize: number, offset: number): THREE.Group {
    const tilesGroup = new THREE.Group();
    const tileMat = this.createFloorTileMaterial();

    for (let x = 0; x < boardSize; x++) {
      for (let z = 0; z < boardSize; z++) {
        const tileGeo = new THREE.BoxGeometry(tileSize * 0.96, 0.08, tileSize * 0.96);
        const tile = new THREE.Mesh(tileGeo, tileMat);
        tile.position.set(x * tileSize - offset, 0.04, z * tileSize - offset);
        tile.receiveShadow = true;
        tile.userData = { isTile: true, gridX: x, gridZ: z };
        tilesGroup.add(tile);
      }
    }
    return tilesGroup;
  }

  public createCaveWallMesh(width: number, height: number, depth: number): THREE.Mesh {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), this.createWallMaterial());
    wall.castShadow = true;
    wall.receiveShadow = true;
    return wall;
  }

  public createCrateMesh(size: number): THREE.Mesh {
    const crateMesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), this.createCrateMaterial());
    crateMesh.castShadow = true;
    crateMesh.receiveShadow = true;
    return crateMesh;
  }

  public createBlueFireMesh(): THREE.Group {
    const fireGroup = new THREE.Group();

    // Braciere in pietra
    const stoneRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.08, 6, 8),
      this.createWallMaterial()
    );
    stoneRing.rotation.x = Math.PI / 2;
    stoneRing.position.y = 0.08;
    fireGroup.add(stoneRing);

    // Fiamma blu cono emissivo
    const fireMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x00f0ff,
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.85
    });

    const fireCone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.65, 6), fireMat);
    fireCone.position.y = 0.38;
    fireGroup.add(fireCone);

    // Luce blu leggera (senza ombre dinamiche pesanti)
    const blueLight = new THREE.PointLight(0x00f0ff, 1.8, 5);
    blueLight.position.set(0, 0.5, 0);
    blueLight.castShadow = false;
    fireGroup.add(blueLight);

    return fireGroup;
  }

  public createCrystalMesh(): THREE.Group {
    const group = new THREE.Group();
    const crystalMat = this.createCrystalMaterial();

    for (let i = 0; i < 4; i++) {
      const height = 0.5 + Math.random() * 0.4;
      const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.14, height, 5), crystalMat);
      mesh.position.set((Math.random() - 0.5) * 0.35, height / 2, (Math.random() - 0.5) * 0.35);
      mesh.rotation.set((Math.random() - 0.5) * 0.3, Math.random() * Math.PI, (Math.random() - 0.5) * 0.3);
      mesh.castShadow = true;
      group.add(mesh);
    }

    const light = new THREE.PointLight(0x00f0ff, 1.2, 3);
    light.position.set(0, 0.5, 0);
    light.castShadow = false;
    group.add(light);
    return group;
  }

  public createShieldMesh(): THREE.Group {
    const group = new THREE.Group();
    const shieldMat = this.createShieldMaterial();
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7 });

    const shieldMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 6), shieldMat);
    shieldMesh.rotation.x = -Math.PI / 3;
    shieldMesh.position.set(0, 0.2, 0);
    shieldMesh.castShadow = true;

    const emblem = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.02), goldMat);
    emblem.rotation.x = -Math.PI / 3;
    emblem.position.set(0, 0.22, 0.02);

    group.add(shieldMesh, emblem);
    return group;
  }

  public createRockMesh(): THREE.Mesh {
    const rockMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 1), this.createWallMaterial());
    rockMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    rockMesh.castShadow = true;
    rockMesh.receiveShadow = true;
    return rockMesh;
  }

  public createSelectionRing(): THREE.Mesh {
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
    const selectionRing = new THREE.Mesh(ringGeo, ringMat);
    selectionRing.visible = false;
    return selectionRing;
  }
}