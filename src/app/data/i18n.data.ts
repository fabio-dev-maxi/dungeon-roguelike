import { IT } from './i18n/it';
import { EN } from './i18n/en';
import { FR } from './i18n/fr';
import { ES } from './i18n/es';
import { DE } from './i18n/de';

export type LangCode = 'it' | 'en' | 'fr' | 'es' | 'de';
export const LANGS: LangCode[] = ['it', 'en', 'fr', 'es', 'de'];
export const LANG_LABELS: Record<LangCode, string> = {
  it: 'IT',
  en: 'EN',
  fr: 'FR',
  es: 'ES',
  de: 'DE'
};

export const I18N: Record<LangCode, any> = {
  it: IT,
  en: EN,
  fr: FR,
  es: ES,
  de: DE
};