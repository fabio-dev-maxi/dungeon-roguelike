import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UpperCasePipe } from '@angular/common';
import { I18nService } from '../../services/i18n.service';
import { CLASS_KEYS, CLASS_FEATS } from '../../data/game.data';
import { MONSTER_IDS_TIER, MONSTER_STATS, BOSS_STATS, MONSTER_XP, BOSS_XP } from '../../data/monster.data';
import { WEAPON_POOLS, ARMOR_POOLS } from '../../data/equipment.data';
import { RELICS } from '../../data/relic.data';
import { ClassKey } from '../../models/game.models';

export type WikiTab = 'monsters' | 'bosses' | 'equipment' | 'relics_feats';

@Component({
  selector: 'app-wiki',
  standalone: true,
  imports: [RouterLink, UpperCasePipe],
  templateUrl: './wiki.component.html',
  styleUrl: './wiki.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WikiComponent {
  readonly activeTab = signal<WikiTab>('monsters');
  readonly selectedClass = signal<ClassKey>('fighter');

  readonly classKeys = CLASS_KEYS;
  readonly monsterTiers = [1, 2, 3, 4, 5, 6];
  readonly equipmentTiers = [1, 2, 3, 4, 5];

  readonly monsterIdsTier = MONSTER_IDS_TIER;
  readonly monsterStats = MONSTER_STATS;
  readonly monsterXp = MONSTER_XP;
  readonly bossStats = BOSS_STATS;
  readonly bossXp = BOSS_XP;
  readonly bossIds = Object.keys(BOSS_STATS);

  readonly weaponPools = WEAPON_POOLS;
  readonly armorPools = ARMOR_POOLS;

  // Calcolo reattivo senza cicli nidificati nel DOM per risposta immediata al click
  readonly selectedClassRelics = computed(() => {
    const cls = this.selectedClass();
    const relicObj = RELICS[cls] || {};
    return Object.keys(relicObj).map(key => ({
      key,
      nameKey: `relics.${key}.name`,
      effectKey: `relics.${key}.effect`
    }));
  });

  readonly selectedClassFeats = computed(() => {
    const cls = this.selectedClass();
    return (CLASS_FEATS[cls] || []).map(feat => ({
      id: feat.id,
      nameKey: `feats.${feat.id}.name`,
      descKey: `feats.${feat.id}.desc`
    }));
  });

  constructor(public i18n: I18nService) {}

  setTab(tab: WikiTab): void {
    this.activeTab.set(tab);
  }

  setClass(cls: ClassKey): void {
    this.selectedClass.set(cls);
  }
}