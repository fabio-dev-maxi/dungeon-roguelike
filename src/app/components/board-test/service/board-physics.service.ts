import { Injectable } from '@angular/core';
import RAPIER from '@dimforge/rapier3d-compat';

@Injectable({
  providedIn: 'root'
})
export class BoardPhysicsService {
  private world: RAPIER.World | null = null;

  /** Inizializza il motore WASM di Rapier e crea il mondo fisico */
  public async initPhysics(): Promise<RAPIER.World> {
    await RAPIER.init();
    this.world = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 });
    return this.world;
  }

  public getWorld(): RAPIER.World | null {
    return this.world;
  }

  public step(): void {
    if (this.world) {
      this.world.step();
    }
  }

  public createFixedGround(width: number, depth: number): RAPIER.RigidBody | null {
    if (!this.world) return null;
    const groundBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.1, 0);
    const groundBody = this.world.createRigidBody(groundBodyDesc);
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(width / 2, 0.1, depth / 2), groundBody);
    return groundBody;
  }

  public createFixedWall(x: number, z: number, width: number, height: number, depth: number): RAPIER.RigidBody | null {
    if (!this.world) return null;
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, height / 2, z);
    const body = this.world.createRigidBody(bodyDesc);
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(width / 2, height / 2, depth / 2).setRestitution(0.4), body);
    return body;
  }

  public createFixedBox(x: number, y: number, z: number, size: number): RAPIER.RigidBody | null {
    if (!this.world) return null;
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z);
    const body = this.world.createRigidBody(bodyDesc);
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(size / 2, size / 2, size / 2).setRestitution(0.3), body);
    return body;
  }

  public createFixedBall(x: number, y: number, z: number, radius: number): RAPIER.RigidBody | null {
    if (!this.world) return null;
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z);
    const body = this.world.createRigidBody(bodyDesc);
    this.world.createCollider(RAPIER.ColliderDesc.ball(radius), body);
    return body;
  }

  public createKinematicBody(x: number, y: number, z: number, colSize: number): RAPIER.RigidBody | null {
    if (!this.world) return null;
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x, y, z);
    const body = this.world.createRigidBody(bodyDesc);
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(colSize, 0.5, colSize), body);
    return body;
  }

  /** Crea un corpo sferico dinamico per il dado d20 */
  public createDynamicBallBody(x: number, y: number, z: number, radius = 0.38): RAPIER.RigidBody | null {
    if (!this.world) return null;
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z);
    const body = this.world.createRigidBody(bodyDesc);
    this.world.createCollider(RAPIER.ColliderDesc.ball(radius).setRestitution(0.65).setDensity(2.0), body);
    return body;
  }

  public removeRigidBody(body: RAPIER.RigidBody): void {
    if (this.world && body) {
      this.world.removeRigidBody(body);
    }
  }

  public convertToRagdoll(unit: any): void {
    if (!this.world || !unit || unit.isRagdoll) return;

    unit.isRagdoll = true;
    if (unit.body) {
      this.world.removeRigidBody(unit.body);
    }

    const pos = unit.root.position;
    const ragdollDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y + 0.2, pos.z);
    const ragdollBody = this.world.createRigidBody(ragdollDesc);
    this.world.createCollider(RAPIER.ColliderDesc.cuboid(0.3, 0.4, 0.3), ragdollBody);

    ragdollBody.applyImpulse({ x: (Math.random() - 0.5) * 8, y: 5.0, z: (Math.random() - 0.5) * 8 }, true);
    unit.body = ragdollBody;
  }

  public syncUnits(units: any[]): void {
    if (!this.world || !units) return;

    units.forEach(u => {
      if (!u || !u.body) return;

      if (u.isRagdoll) {
        const pos = u.body.translation();
        const rot = u.body.rotation();
        u.root.position.set(pos.x, pos.y, pos.z);
        u.root.quaternion.set(rot.x, rot.y, rot.z, rot.w);
      } else {
        const pos = u.root.position;
        u.body.setNextKinematicTranslation({ x: pos.x, y: pos.y, z: pos.z });
      }
    });
  }
}