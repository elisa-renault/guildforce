import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, Translations, loadTranslations } from '@/i18n/translations';
import { LoadingScreen } from '@/components/ui/loading-screen';

export type { Language } from '@/i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    // Check localStorage first
    const stored = localStorage.getItem('preferred_language');
    if (stored === 'en' || stored === 'fr') return stored;
    
    // Check browser language
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('fr')) return 'fr';
    return 'en';
  });
  const [t, setT] = useState<Translations | null>(null);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('preferred_language', lang);
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    let cancelled = false;
    loadTranslations(language).then((loaded) => {
      if (!cancelled) {
        setT(loaded);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [language]);

  if (!t) {
    return <LoadingScreen message={language === 'fr' ? 'Chargement...' : 'Loading...'} />;
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
