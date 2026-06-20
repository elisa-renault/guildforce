import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import { LoadingScreen } from '@/components/ui/loading-screen';
import { detectLanguageFromNavigator, getBilingualValue, resolveLanguage } from '@/i18n/config';
import { Language, Translations, loadTranslations } from '@/i18n/translations';
import { translationsEn } from '@/i18n/translations.en';

export type { Language } from '@/i18n/config';
type RuntimeTranslations = Translations & { lang: Language };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: RuntimeTranslations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const getInitialLanguage = (): Language => {
  // Check localStorage first
  const stored = localStorage.getItem('preferred_language');
  if (stored) return resolveLanguage(stored);

  // Check browser language
  return detectLanguageFromNavigator(navigator.language);
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => getInitialLanguage());
  const [t, setT] = useState<RuntimeTranslations | null>(() =>
    language === 'en' ? ({ ...translationsEn, lang: language } as RuntimeTranslations) : null,
  );

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('preferred_language', lang);
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    let cancelled = false;
    setT(language === 'en' ? ({ ...translationsEn, lang: language } as RuntimeTranslations) : null);
    loadTranslations(language).then((loaded) => {
      if (!cancelled) {
        setT({ ...(loaded as Translations), lang: language });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [language]);

  if (!t) {
    return (
      <LoadingScreen
        message={getBilingualValue(language, { en: 'Loading...', fr: 'Chargement...' })}
      />
    );
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
