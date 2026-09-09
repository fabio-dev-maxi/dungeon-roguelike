import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../../services/i18n.service';
import { CustomDataService } from '../../../services/custom-data.service';
import { CLASS_KEYS, CLASS_FEATS } from '../../../data/game.data';
import { MONSTER_IDS_TIER, MONSTER_XP, BOSS_XP } from '../../../data/monster.data';
import { ClassKey } from '../../../models/game.models';
import { RELICS } from '../../../data/relic.data';

/**
 * Tipi di schede/tab selezionabili nel compendio della Wiki.
 * Include il nuovo sistema di mappe a nodi DAG e le schede storiche.
 */
export type WikiTab = 'map_system' | 'monsters' | 'bosses' | 'equipment' | 'relics_feats' | 'heroes';

/**
 * COMPONENTE WIKI & EDITOR STATISTICHE
 * 
 * Permette la consultazione del compendio di D&D 3.5, della struttura del dungeon a 7 layer
 * e la modifica in tempo reale delle statistiche di mostri, armi, armature ed eroi.
 * Sviluppato con architettura Angular 20 Standalone e ChangeDetection OnPush.
 */
@Component({
  selector: 'app-wiki',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './wiki.component.html',
  styleUrl: './wiki.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WikiComponent {
  /** Espone l'oggetto globale JavaScript Object al template HTML per metodi come Object.keys() */
  readonly Object = Object;

  /** Segnale reattivo per la scheda/tab attualmente attiva */
  readonly activeTab = signal<WikiTab>('map_system');

  /** Segnale reattivo per la classe selezionata nei filtri dell'equipaggiamento e reliquie */
  readonly selectedClass = signal<ClassKey>('fighter');

  /** Elenco delle chiavi delle 4 classi base D&D 3.5 */
  readonly classKeys = CLASS_KEYS;

  /** Gradi di sfida (Tiers) dei mostri dal livello 1 al 6 */
  readonly monsterTiers = [1, 2, 3, 4, 5, 6];

  /** Tiers di rarità/potenza dell'equipaggiamento (Tier 1..5) */
  readonly equipmentTiers = [1, 2, 3, 4, 5];

  /** Mappatura degli ID dei mostri raggruppati per Tier */
  readonly monsterIdsTier = MONSTER_IDS_TIER;

  /** Tabella dei Punti Esperienza (XP) assegnati dai mostri standard */
  readonly monsterXp = MONSTER_XP;

  /** Tabella degli XP speciali per la sconfitta dei Custodi dei Piani (Boss) */
  readonly bossXp = BOSS_XP;

  /** Mappatura dei talenti di classe selezionabili al passaggio di livello */
  readonly classFeats = CLASS_FEATS;

  /**
   * Calcolo reattivo (Signal Computed) delle reliquie della classe selezionata.
   * Evita cicli nidificati nel DOM per una risposta immediata al cambio classe.
   */
  readonly selectedClassRelics = computed(() => {
    const cls = this.selectedClass();
    const relicObj = RELICS[cls] || {};
    return Object.keys(relicObj).map((key) => ({
      key,
      nameKey: `relics.${key}.name`,
      effectKey: `relics.${key}.effect`,
    }));
  });

  /**
   * Calcolo reattivo (Signal Computed) dei talenti specifici della classe selezionata.
   */
  readonly selectedClassFeats = computed(() => {
    const cls = this.selectedClass();
    return (CLASS_FEATS[cls] || []).map((feat) => ({
      id: feat.id,
      nameKey: `feats.${feat.id}.name`,
      descKey: `feats.${feat.id}.desc`,
    }));
  });

  constructor(
    public i18n: I18nService,
    public customData: CustomDataService
  ) { }

  /**
   * Cambia la scheda/tab attiva nella vista Wiki.
   * @param tab Il nome del tab da attivare
   */
  setTab(tab: WikiTab): void {
    this.activeTab.set(tab);
  }

  /**
   * Imposta la classe selezionata per filtrare armi, armature, reliquie ed eroi.
   * @param cls Chiave della classe D&D 3.5
   */
  setClass(cls: ClassKey): void {
    this.selectedClass.set(cls);
  }

  /**
   * Ripristina tutti i valori di mostri, boss ed equipaggiamento ai dati di default iniziali.
   */
  resetDefaults(): void {
    this.customData.resetToDefaults();
  }
}