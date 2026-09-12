import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

@Injectable({
  providedIn: 'root'
})
export class BoardEngineService {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private clock = new THREE.Clock();

  public initThree(canvas: HTMLCanvasElement): { scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer; controls: OrbitControls } {
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
    this.controls.touches = {
      ONE: undefined as any,
      TWO: THREE.TOUCH.DOLLY_PAN
    };

    this.setupLighting();

    return { scene: this.scene, camera: this.camera, renderer: this.renderer, controls: this.controls };
  }

  private setupLighting(): void {
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
  }

  public getDelta(): number {
    return this.clock.getDelta();
  }

  public render(): void {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  public focusOnPosition(pos: THREE.Vector3): void {
    this.controls.target.set(pos.x, 0, pos.z);
    this.controls.update();
  }

  public rotateCamera(degrees: number): void {
    const radians = (degrees * Math.PI) / 180;
    const currentPos = this.camera.position.clone().sub(this.controls.target);
    currentPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), radians);
    this.camera.position.copy(this.controls.target).add(currentPos);
    this.controls.update();
  }

  public dispose(): void {
    this.renderer?.dispose();
  }
}