import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "fr" | "en" | "wo" | "bm" | "sw" | "ar" | "pt";

export interface LanguageInfo {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

export const LANGUAGES: LanguageInfo[] = [
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "wo", name: "Wolof", nativeName: "Wolof", flag: "🇸🇳" },
  { code: "bm", name: "Bambara", nativeName: "Bamanankan", flag: "🇲🇱" },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili", flag: "🇰🇪" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹" },
];

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  currentLanguage: LanguageInfo;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem("freemind-language");
    return (stored as Language) || "fr"; // French is the default
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("freemind-language", lang);
  };

  const currentLanguage = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  return (
    <I18nContext.Provider value={{ language, setLanguage, currentLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
