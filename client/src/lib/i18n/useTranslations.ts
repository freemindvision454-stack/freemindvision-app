import { useI18n } from "./context";
import { translations } from "./translations";

export function useTranslations() {
  const { language } = useI18n();
  return translations[language];
}
