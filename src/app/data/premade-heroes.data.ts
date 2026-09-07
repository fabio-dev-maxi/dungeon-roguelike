import { ClassKey, Stats } from '../models/game.models';

export interface PremadeHero {
  id: string;
  name: string;
  title: string;
  stats: Stats;
}

export const PREMADE_HEROES: Record<ClassKey, PremadeHero[]> = {
  fighter: [
    { id: 'f1', name: 'Ragnar il Distruttore', title: 'Campione dell\'Arena', stats: { str: 18, dex: 12, con: 16, int: 8, wis: 10, cha: 10 } },
    { id: 'f2', name: 'Sir Eldrin lo Scudo', title: 'Paladino Decaduto', stats: { str: 15, dex: 10, con: 15, int: 12, wis: 13, cha: 11 } },
    { id: 'f3', name: 'Garek il Veterano', title: 'Mercenario di Ventura', stats: { str: 14, dex: 13, con: 12, int: 10, wis: 11, cha: 10 } },
    { id: 'f4', name: 'Balthazar lo Stanco', title: 'Guardia Invecchiata', stats: { str: 12, dex: 9, con: 10, int: 11, wis: 12, cha: 8 } },
    { id: 'f5', name: 'Kaelen il Berserker', title: 'Furia Incontenibile', stats: { str: 17, dex: 14, con: 8, int: 7, wis: 9, cha: 12 } }
  ],
  rogue: [
    { id: 'r1', name: 'Silas Lancia d\'Ombra', title: 'Maestro degli Assassini', stats: { str: 10, dex: 18, con: 12, int: 14, wis: 10, cha: 15 } },
    { id: 'r2', name: 'Nyx Occhio di Gatto', title: 'Ladrone Notturno', stats: { str: 11, dex: 16, con: 13, int: 12, wis: 11, cha: 13 } },
    { id: 'r3', name: 'Jarek Mano Lesta', title: 'Tagliaborse Urbano', stats: { str: 12, dex: 14, con: 11, int: 10, wis: 10, cha: 12 } },
    { id: 'r4', name: 'Corvo Zoppo', title: 'Informatore dei Vicoli', stats: { str: 9, dex: 11, con: 10, int: 12, wis: 11, cha: 8 } },
    { id: 'r5', name: 'Vane il Velenoso', title: 'Alchimista Clandestino', stats: { str: 8, dex: 17, con: 9, int: 15, wis: 8, cha: 10 } }
  ],
  wizard: [
    { id: 'w1', name: 'Archimago Ignis', title: 'Signore del Fuoco', stats: { str: 8, dex: 12, con: 10, int: 18, wis: 15, cha: 12 } },
    { id: 'w2', name: 'Valerius il Sapiente', title: 'Erudito della Torre', stats: { str: 9, dex: 11, con: 12, int: 16, wis: 14, cha: 11 } },
    { id: 'w3', name: 'Elion l\'Apprendista', title: 'Studioso di Magia', stats: { str: 10, dex: 12, con: 11, int: 14, wis: 11, cha: 10 } },
    { id: 'w4', name: 'Marek il Rifiutato', title: 'Evocatore Fallito', stats: { str: 10, dex: 10, con: 9, int: 12, wis: 10, cha: 9 } },
    { id: 'w5', name: 'Zarek l\'Astrale', title: 'Osservatore delle Stelle', stats: { str: 7, dex: 14, con: 8, int: 17, wis: 12, cha: 14 } }
  ],
  cleric: [
    { id: 'c1', name: 'Padre Lucius', title: 'Portatore della Luce', stats: { str: 14, dex: 10, con: 15, int: 11, wis: 18, cha: 14 } },
    { id: 'c2', name: 'Sorella Elena', title: 'Guaritrice Sacra', stats: { str: 12, dex: 10, con: 13, int: 12, wis: 16, cha: 13 } },
    { id: 'c3', name: 'Frate Tuck', title: 'Monaco di Campagna', stats: { str: 13, dex: 9, con: 12, int: 10, wis: 14, cha: 11 } },
    { id: 'c4', name: 'Kaelen il Penitente', title: 'Pellegrino Soffrente', stats: { str: 11, dex: 8, con: 10, int: 10, wis: 12, cha: 9 } },
    { id: 'c5', name: 'Gideon l\'Inquisitore', title: 'Martello della Fede', stats: { str: 15, dex: 11, con: 14, int: 9, wis: 15, cha: 8 } }
  ]
};