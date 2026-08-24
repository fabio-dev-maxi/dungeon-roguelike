# La Guglia Cava — Discesa Infinita

Roguelike a turni in stile D&D 3.5, convertito da prototipo HTML/JS a progetto **Angular** (standalone components + signals).

## Avvio

```bash
npm install
npm start
```

L'app sarà disponibile su `http://localhost:4200`.

## Build di produzione

```bash
npm run build
```

I file compilati verranno generati in `dist/guglia-cava-roguelike`.

## Struttura del progetto

```
src/app/
  models/            interfacce TypeScript (Player, Monster, GameState, ...)
  data/
    i18n.data.ts      traduzioni complete (IT/EN/FR/ES/DE)
    game.data.ts      dati di bilanciamento: classi, mostri, boss, XP, reliquie
  services/
    dice.service.ts   utility per tiri di dado (d20, dadi danno, pick pesato...)
    i18n.service.ts   risoluzione traduzioni e formattazione stringhe
    game.service.ts   stato di gioco (signal) e tutta la logica: combattimento,
                       eventi casuali, level up, reliquie
  components/
    lang-bar/          selettore lingua
    dice-widget/        dado animato (elemento distintivo del gioco)
    title-screen/       schermata iniziale
    character-creation/ tiro statistiche e scelta classe
    game-screen/         scheda personaggio + log + azioni (con pannello
                          compatto e fisso in alto su mobile)
    level-up-modal/      popup di scelta caratteristica al level up
    game-over/           schermata di game over
  app.component.ts      root, instrada tra le schermate in base allo stato
```

## Note di conversione

- Lo stato di gioco è gestito con **Angular Signals** (`signal()` in `GameService`),
  seguendo lo stesso pattern imperativo dell'originale (si muta lo stato e si
  notifica il cambiamento), per fedeltà di comportamento col prototipo.
- Tutti i dati di bilanciamento (classi, mostri, boss, reliquie, traduzioni)
  sono stati estratti 1:1 dal prototipo originale, senza riscritture.
- Il pannello personaggio (`#sheet-panel`) diventa fisso e compatto sotto i
  720px di larghezza, per restare sempre visibile durante lo scroll del log
  su mobile.
- Nessuno storage persistente (localStorage) è usato: il "record di sessione"
  vive solo in memoria, come nel prototipo originale.
