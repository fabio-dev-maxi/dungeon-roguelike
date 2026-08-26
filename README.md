# La Guglia Cava — Discesa Infinita

Roguelike a turni in stile D&D 3.5, convertito da prototipo HTML/JS a progetto **Angular** (standalone components + signals) con rendering 3D dei dadi via Three.js.

## Avvio rapido

```bash
npm install
npm start
```

L'applicazione sarà disponibile all'indirizzo `http://localhost:4200`.

## Build di produzione

```bash
npm run build
```

I file compilati verranno generati nella cartella `dist/guglia-cava-roguelike`.

---

## Struttura del progetto

```
src/app/
  models/
    game.models.ts        Interfacce TypeScript (Player, Monster, GameState, Feat, ...)
  data/
    i18n.data.ts          Traduzioni complete 1:1 (IT, EN, FR, ES, DE) con blocco 'feats'
    game.data.ts          Dati di bilanciamento: classi, mostri, boss, XP, reliquie, talenti
  services/
    dice.service.ts       Utility per tiri di dado (d20, dadi danno, estrazioni pesate)
    i18n.service.ts       Risoluzione traduzioni e formattazione dinamica delle stringhe
    game-state.service.ts Gestione dello stato reattivo centrale (Signals), log e animazioni dadi
    character.service.ts  Creazione personaggio, tiro caratteristiche ed equipaggiamento
    monster.service.ts    Generazione procedurale dei mostri, boss e scaling di livello
    encounter.service.ts  Gestione eventi (trappole, altari, mercante, taverna, tesori)
    combat.service.ts     Logica di combattimento, attacchi, difese, abilità speciali e IA mostro
    level-up.service.ts   Progressione di livello: dadi vita, punti caratteristica e talenti
    game.service.ts       Facade centralizzato che coordina i sotto-servizi
  components/
    lang-bar/             Selettore lingua (IT, EN, FR, ES, DE)
    dice-widget/          Rendering 3D Three.js (d20, d10 trapezoedro pentagonale, d8, d6, d4)
    title-screen/         Schermata iniziale e lore
    character-creation/   Tiro statistiche e selezione classe
    game-screen/          Scheda personaggio + log + azioni
    level-up-modal/       Modal di avanzamento livello (caratteristiche, talenti e dado vita)
    game-over/            Schermata di fine partita
  app.component.ts        Root component e instradamento schermate
```

---

## Meccaniche di Gioco e Progressione

* **Aumento Caratteristiche**: +1 a una statistica a scelta **ogni 2 livelli**.
* **Selezione Talenti**: Scelta tra 5 talenti bilanciati di classe **ogni 3 livelli**.
* **Punti Ferita (HP)**: Tiro del dado vita specifico della classe (es. d10 per il Guerriero) **a ogni livello**.
* **Talenti del Guerriero**:
  * *Maestro d'Armi*: +1 ai tiri per Colpire e +1 ai Danni.
  * *Pelle di Ferro*: +1 permanente alla Classe Armatura (CA).
  * *Colpitore Spietato*: Riduce la soglia del Colpo Critico di 1.
  * *Vigore da Battaglia*: +6 Punti Ferita Massimi immediati.
  * *Critico Devastante*: I colpi critici infliggono x2.5 danni invece di x2.
* **Critici Cumulativi**: La riduzione della soglia di colpo critico (es. talento *Colpitore Spietato* + reliquia *Amuleto del Sangue Antico*) si somma cumulativamente (es. 20 -> 19+ -> 18+).

---

## Architettura e Note Tecniche

* **Architettura a Sotto-Servizi (SRP)**: La logica di gioco è suddivisa in sotto-servizi specializzati a responsabilità singola, gestiti in modo trasparente dal Facade `GameService` per mantenere la retrocompatibilità.
* **Stato Reattivo con Signals**: Lo stato globale sfrutta gli **Angular Signals** (`signal()`), notificando le variazioni di UI in tempo reale.
* **Widget Dadi 3D (Three.js)**: 
  * Il **d10** usa un trapezoedro pentagonale geometricamente complanare con proiezione planare delle coordinate UV, eliminando distorsioni visive e pieghe sulla texture.
  * Il **d20** e gli altri dadi mantengono quaternioni di destinazione corretti per mostrare la faccia estratta dritta e perfettamente orientata verso la telecamera.
* **Interfaccia Responsive**: Scheda personaggio compatta e fissa sotto i 720px di larghezza per ottimizzare lo scroll del registro su dispositivi mobile.