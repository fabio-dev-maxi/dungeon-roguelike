import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Elenco COMPLETO di tutti i vettori SVG supportati dal gioco.
 */
export type IconName =
  | 'sword'       // Guerriero / Attacco
  | 'swords'      // Combattimento Mostro
  | 'shield'      // Difesa / Armatura
  | 'skull'       // Trappola
  | 'crown'       // Boss
  | 'star'        // Esperienza (XP) / Carisma
  | 'coin'        // Oro
  | 'chest'       // Forziere
  | 'scale'         // Mercante
  | 'flask'       // Pozione
  | 'stairs'      // Mappa / Discesa
  | 'scroll'      // Pergamena / Evento
  | 'cup'         // Taverna / Riposo
  | 'sun'         // Santuario / Chierico
  | 'gem'         // Reliquia
  | 'boot'        // Fuga
  | 'heart'       // Salute (HP) / Costituzione
  | 'eye'         // Saggezza
  | 'x'           // Chiudi / Annulla
  | 'check'       // Conferma / Successo
  | 'dot'         // Indicatore
  | 'arrow-right' // Salta / Avanti
  | 'dice'        // Dado D&D
  | 'dagger'      // Ladro
  | 'staff'       // Mago
  | 'fist'        // Forza
  | 'feather'     // Destrezza
  | 'book'        // Intelligenza
  | 'layers'      // Strati / Livelli
  | 'backpack'    // Zaino / Inventario
  | 'key'         // Chiave
  | 'globe'       // Mondo / Esplorazione
  | 'axe'         // guerriero / Ascia
  | 'muscle'       // Forza
  | 'hammer';     // Fabbro / Miglioramento Arma

/**
 * COMPONENTE ICONA VETTORIALE REATTIVA
 */
@Component({
  selector: 'app-icon',
  standalone: true,
  templateUrl: './icon.component.html',
  styleUrl: './icon.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input<number>(20);
}