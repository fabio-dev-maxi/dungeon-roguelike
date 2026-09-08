import { Injectable } from '@angular/core';
import * as THREE from 'three';

/** Interfaccia per il corpo rigido simulato nel motore fisico */
export interface PhysicalDieBody {
  /** Riferimento alla Mesh Three.js nel render grafico */
  mesh: THREE.Mesh;
  /** Vettore posizione nello spazio 3D (x, y, z) */
  pos: THREE.Vector3;
  /** Vettore velocità traslazionale (vx, vy, vz) */
  vel: THREE.Vector3;
  /** Quaternione di rotazione corrente */
  rot: THREE.Quaternion;
  /** Vettore velocità angolare (rotazione sui 3 assi) */
  angVel: THREE.Vector3;
  /** Raggio esatto della sfera circoscritta di collisione */
  radius: number;
  /** Quaternione bersaglio della faccia finale estraibile */
  targetQ: THREE.Quaternion;
  /** Valore numerico estratto per questo dado */
  val: number;
}

/**
 * Servizio preposto al calcolo delle traiettorie dei dadi, integrazione della gravità,
 * collisioni elastiche dado-contro-dado, rimbalzi con le pareti della board e attrito sul feltro.
 */
@Injectable({ providedIn: 'root' })
export class DicePhysicsService {

  /**
   * Inizializza i dadi con posizioni distanziate lungo l'asse X e impulsi di lancio casuali.
   * @param dice Array dei corpi rigidi dei dadi
   */
  public initMultiRoll(dice: PhysicalDieBody[]): void {
    const count = dice.length;
    dice.forEach((b, idx) => {
      // Distanziamento iniziale per prevenire sovrapposizioni a t=0
      const spreadStep = count > 3 ? 1.25 : count === 3 ? 1.50 : 1.80;
      const spreadX = (idx - (count - 1) / 2) * spreadStep;

      b.pos.set(spreadX, 1.0 + Math.random() * 0.2, -0.15);

      b.vel.set(
        (Math.random() - 0.5) * 3.2,
        -3.8 - Math.random() * 1.8,
        (Math.random() - 0.5) * 2.2
      );

      b.angVel.set(
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 16
      );
    });
  }

  /**
   * Esegue un passo dell'integrazione fisica di Eulero per la posizione, la rotazione e gli urti.
   * @param dice Array di dadi da aggiornare
   * @param dt Delta time della cornice di rendering (es. 0.016s)
   * @param trayW Larghezza limite del feltro della board
   * @param trayH Profondità limite del feltro della board
   * @param rollProgress Progresso normalizzato da 0.0 a 1.0 della fase di lancio
   */
  public updateMultiPhysicsStep(
    dice: PhysicalDieBody[],
    dt: number,
    trayW: number,
    trayH: number,
    rollProgress: number
  ): void {
    dice.forEach((b) => {
      // 1. Aggiornamento posizione in base alla velocità traslazionale
      b.pos.addScaledVector(b.vel, dt);
      b.vel.y -= 22 * dt; // Forza di gravità verso il feltro

      // 2. Integrazione rotazione: tumulto libero iniziale, poi orientamento controllato verso targetQ
      if (rollProgress < 0.35) {
        const speed = b.angVel.length();
        if (speed > 0.001) {
          const axis = b.angVel.clone().normalize();
          const dq = new THREE.Quaternion().setFromAxisAngle(axis, speed * dt);
          b.rot.premultiply(dq);
        }
      } else {
        // Slerp progressivo verso il quaternione di destinazione della faccia
        const alignFactor = Math.min((rollProgress - 0.35) * 0.22, 0.25);
        b.rot.slerp(b.targetQ, alignFactor);
        b.angVel.multiplyScalar(0.65);
      }

      // 3. Collisione e rimbalzo sul feltro della board (piano y = -0.15)
      if (b.pos.y <= -0.15) {
        b.pos.y = -0.15;
        if (b.vel.y < 0) {
          if (Math.abs(b.vel.y) > 0.3) {
            b.vel.y = -b.vel.y * 0.3; // Coefficiente di restituzione verticale
            if (rollProgress < 0.35) {
              b.angVel.x += (Math.random() - 0.5) * Math.abs(b.vel.y) * 2;
              b.angVel.z += (Math.random() - 0.5) * Math.abs(b.vel.y) * 2;
            }
          } else {
            b.vel.y = 0; // Stasi verticale
          }
        }
        // Attrito radente del feltro
        const friction = rollProgress > 0.4 ? 0.75 : 0.85;
        b.vel.x *= friction;
        b.vel.z *= friction;
      }

      // 4. Collisione con le pareti perimetrali del vassoio in legno
      const limitX = trayW - b.radius;
      const limitZ = trayH - b.radius;

      if (Math.abs(b.pos.x) >= limitX) {
        b.pos.x = Math.sign(b.pos.x) * limitX;
        b.vel.x = -b.vel.x * 0.45; // Rimbalzo parete X
      }
      if (Math.abs(b.pos.z) >= limitZ) {
        b.pos.z = Math.sign(b.pos.z) * limitZ;
        b.vel.z = -b.vel.z * 0.45; // Rimbalzo parete Z
      }

      // Smorzamento inerziale generale
      b.vel.multiplyScalar(0.95);
    });

    // 5. Risolutore di collisione elastica Dado-contro-Dado (2 passaggi anti-compenetrazione)
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < dice.length; i++) {
        for (let j = i + 1; j < dice.length; j++) {
          const dA = dice[i];
          const dB = dice[j];
          const delta = dB.pos.clone().sub(dA.pos);
          const dist = delta.length();
          const minDist = dA.radius + dB.radius + 0.25; // Cuscinetto di separazione aumentato

          // Se le sfere di ingombro si intersecano, risolvi la penetrazione
          if (dist < minDist && dist > 0.0001) {
            const normal = delta.clone().divideScalar(dist);
            const overlap = minDist - dist;

            // Separazione dei due corpi
            dA.pos.addScaledVector(normal, -overlap * 0.5);
            dB.pos.addScaledVector(normal, overlap * 0.5);

            // Scambio della quantità di moto lungo la normale di impatto
            const relVel = dA.vel.clone().sub(dB.vel);
            const velAlongNormal = relVel.dot(normal);
            if (velAlongNormal > 0) {
              const impulse = 1.2 * velAlongNormal * 0.5;
              dA.vel.addScaledVector(normal, -impulse);
              dB.vel.addScaledVector(normal, impulse);

              // Torsione rotazionale generata dall'impatto proporzionale alla velocità
              if (velAlongNormal > 0.2 && rollProgress < 0.4) {
                const torque = Math.min(velAlongNormal * 3.5, 10);
                dA.angVel.addScaledVector(normal, torque);
                dB.angVel.addScaledVector(normal, -torque);
              }
            }
          }
        }
      }
    }

    // Sincronizzazione finale delle Mesh Three.js con i corpi fisici
    dice.forEach((b) => {
      b.mesh.position.copy(b.pos);
      b.mesh.quaternion.copy(b.rot);
    });
  }
}