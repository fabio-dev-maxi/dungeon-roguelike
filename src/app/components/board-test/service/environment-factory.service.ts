import { Injectable } from '@angular/core';
import * as THREE from 'three';

@Injectable({
  providedIn: 'root'
})
export class EnvironmentFactoryService {

  createCaveStoneTexture(isDark: boolean): THREE.CanvasTexture {
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

  createWoodCrateTexture(): THREE.CanvasTexture {
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

  createFloorMesh(totalBoardWidth: number): THREE.Mesh {
    const floorGeo = new THREE.BoxGeometry(totalBoardWidth + 2, 0.2, totalBoardWidth + 2);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x3d3026, roughness: 0.75, metalness: 0.1 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, -0.1, 0);
    floorMesh.receiveShadow = true;
    return floorMesh;
  }

  createTilesGroup(boardSize: number, tileSize: number, offset: number): THREE.Group {
    const tilesGroup = new THREE.Group();
    const stoneTexDark = this.createCaveStoneTexture(true);
    const stoneTexLight = this.createCaveStoneTexture(false);

    const darkMat = new THREE.MeshStandardMaterial({ map: stoneTexDark, roughness: 0.7 });
    const lightMat = new THREE.MeshStandardMaterial({ map: stoneTexLight, roughness: 0.7 });

    for (let x = 0; x < boardSize; x++) {
      for (let z = 0; z < boardSize; z++) {
        const tileGeo = new THREE.BoxGeometry(tileSize * 0.96, 0.08, tileSize * 0.96);
        const isDark = (x + z) % 2 === 1;
        const tile = new THREE.Mesh(tileGeo, isDark ? darkMat : lightMat);
        tile.position.set(x * tileSize - offset, 0.04, z * tileSize - offset);
        tile.receiveShadow = true;
        tile.userData = { isTile: true, gridX: x, gridZ: z };
        tilesGroup.add(tile);
      }
    }
    return tilesGroup;
  }

  createCaveWallMesh(width: number, height: number, depth: number): THREE.Mesh {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a2b20, roughness: 0.85 });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMat);
    wall.castShadow = true;
    wall.receiveShadow = true;
    return wall;
  }

  createRockMesh(): THREE.Mesh {
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
    rockMesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    rockMesh.castShadow = true;
    rockMesh.receiveShadow = true;
    return rockMesh;
  }

  createCrateMesh(size: number, crateTexture: THREE.CanvasTexture): THREE.Mesh {
    const crateMat = new THREE.MeshStandardMaterial({ map: crateTexture, roughness: 0.7, metalness: 0.1 });
    const crateMesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), crateMat);
    crateMesh.castShadow = true;
    crateMesh.receiveShadow = true;
    return crateMesh;
  }

  createSelectionRing(): THREE.Mesh {
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