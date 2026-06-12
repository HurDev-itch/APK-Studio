import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enCommon from '../../../locales/en/common.json';
import frCommon from '../../../locales/fr/common.json';

const resources = {
  en: { common: enCommon },
  fr: { common: frCommon }
  // Other 10 languages will be added here following the same pattern
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", 
    fallbackLng: "en",
    ns: ['common'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
