import { useI18n, LANGUAGES, type Language } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface LanguageSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LanguageSelector({ open, onOpenChange }: LanguageSelectorProps) {
  const { language, setLanguage, currentLanguage } = useI18n();

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-poppins font-bold">
            Choisir la langue / Choose Language
          </DialogTitle>
          <DialogDescription>
            Langue actuelle: {currentLanguage.nativeName} {currentLanguage.flag}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-2 py-4">
          {LANGUAGES.map((lang) => {
            const isSelected = language === lang.code;
            
            return (
              <Button
                key={lang.code}
                variant={isSelected ? "default" : "outline"}
                className="w-full justify-between h-auto py-3"
                onClick={() => handleLanguageSelect(lang.code)}
                data-testid={`button-language-${lang.code}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{lang.flag}</span>
                  <div className="text-left">
                    <div className="font-semibold">{lang.nativeName}</div>
                    <div className="text-xs text-muted-foreground">{lang.name}</div>
                  </div>
                </div>
                {isSelected && <Check className="w-5 h-5" />}
              </Button>
            );
          })}
        </div>

        <div className="text-xs text-muted-foreground text-center">
          Plus de langues à venir / More languages coming soon
        </div>
      </DialogContent>
    </Dialog>
  );
}
