import { ClassKey, StatKey } from '../../models/game.models';
import { IconName } from './icon.component';

export const CLASS_ICONS: Record<ClassKey, IconName> = {
  fighter: 'axe',
  rogue: 'dagger',
  wizard: 'staff',
  cleric: 'sun'
};

export const STAT_ICONS: Record<StatKey, IconName> = {
  str: 'muscle',
  dex: 'feather',
  con: 'heart',
  int: 'book',
  wis: 'eye',
  cha: 'star'
};