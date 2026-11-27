'use client';
import React from 'react';
import { useLanguage, Language } from '@/app/contexts/LanguageContext';
import { useI18n } from '@/app/contexts/I18nContext';
import { Globe } from 'lucide-react';

const languages: { code: Language; name: string; label: string; flag: string }[] = [
  { code: 'pt-BR', name: 'Português', label: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'en-US', name: 'English', label: 'Inglês', flag: '🇺🇸' },
  { code: 'es-ES', name: 'Español', label: 'Espanhol', flag: '🇪🇸' },
];

export const LanguageSwitcher: React.FC<{ variant?: 'light' | 'dark'; compactOnMobile?: boolean }> = ({ variant = 'light', compactOnMobile = false }) => {
  const { language, setLanguage } = useLanguage();
  const { t } = useI18n();
  const [isOpen, setIsOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const closeOutside = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false); };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsOpen(false); };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeOnEscape); };
  }, [isOpen]);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setIsOpen(false);
  };

  const currentLanguage = languages.find(l => l.code === language);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 sm:px-4 ${
          variant === 'dark'
            ? 'border-white/10 bg-white/5 text-white hover:bg-white/10'
            : 'border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={t('Selecionar idioma: {language}', { language: currentLanguage?.name ?? '' })}
      >
        <Globe size={16} />
        <span className={compactOnMobile ? 'hidden sm:inline' : ''}>{currentLanguage?.flag} {currentLanguage?.name}</span>
        {compactOnMobile && <span className="text-xs font-bold sm:hidden">{language.slice(0, 2).toUpperCase()}</span>}
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 top-full z-50 mt-2 min-w-48 overflow-hidden rounded-lg border shadow-xl ${
            variant === 'dark'
              ? 'border-white/15 bg-[#171329] text-white'
              : 'border-zinc-200 bg-white text-zinc-900'
          }`}
          role="listbox"
          aria-label={t('Idiomas disponíveis')}
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => handleLanguageChange(lang.code)}
              className={`flex w-full items-center gap-2 border-l-2 px-4 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-purple-500 ${
                variant === 'dark'
                  ? `text-white hover:bg-white/10 ${language === lang.code ? 'border-purple-400 bg-purple-500/20' : 'border-transparent'}`
                  : `text-zinc-900 hover:bg-purple-50 ${language === lang.code ? 'border-purple-600 bg-purple-50 font-semibold' : 'border-transparent'}`
              }`}
              role="option"
              aria-selected={language === lang.code}
            >
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
              <span className={`ml-auto text-xs ${variant === 'dark' ? 'text-white/65' : 'text-zinc-500'}`}>{t(lang.label)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
