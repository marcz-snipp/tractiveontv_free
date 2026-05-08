import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type SupportedLocale } from '@tot/shared';
import frFR from '../../locales/fr-FR/common.json';
import enUS from '../../locales/en-US/common.json';
import esES from '../../locales/es-ES/common.json';
import itIT from '../../locales/it-IT/common.json';
import deDE from '../../locales/de-DE/common.json';
import { prefs } from './storage';
import { setDayjsLocale } from './dayjs';

const resources = {
  'fr-FR': { common: frFR },
  'en-US': { common: enUS },
  'es-ES': { common: esES },
  'it-IT': { common: itIT },
  'de-DE': { common: deDE },
} as const;

function detectInitialLocale(): SupportedLocale {
  const stored = prefs.getLocale();
  if (stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) {
    return stored as SupportedLocale;
  }
  const device = getLocales()[0]?.languageTag ?? DEFAULT_LOCALE;
  const exact = (SUPPORTED_LOCALES as readonly string[]).find((l) => l === device);
  if (exact) return exact as SupportedLocale;
  const lang = device.split('-')[0];
  const matched = (SUPPORTED_LOCALES as readonly string[]).find(
    (l) => l.split('-')[0] === lang,
  );
  return (matched ?? DEFAULT_LOCALE) as SupportedLocale;
}

const initialLocale = detectInitialLocale();

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLocale,
  fallbackLng: 'en-US',
  defaultNS: 'common',
  ns: ['common'],
  interpolation: { escapeValue: false },
  returnNull: false,
  compatibilityJSON: 'v4',
});

setDayjsLocale(initialLocale);

export function changeLocale(locale: SupportedLocale): Promise<unknown> {
  prefs.setLocale(locale);
  setDayjsLocale(locale);
  return i18n.changeLanguage(locale);
}

export { i18n };
export default i18n;
