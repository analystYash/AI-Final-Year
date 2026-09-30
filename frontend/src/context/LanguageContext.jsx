import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, getTranslation } from '../utils/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('drugai_lang') || 'english';
  });

  useEffect(() => {
    localStorage.setItem('drugai_lang', lang);
  }, [lang]);

  const t = (key) => getTranslation(lang, key);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, translations: translations[lang] || translations.english }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      lang: 'english',
      setLang: () => {},
      t: (key) => getTranslation('english', key),
      translations: translations.english
    };
  }
  return context;
}
