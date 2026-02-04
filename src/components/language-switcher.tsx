'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Languages } from 'lucide-react';
import { locales, type Locale } from '@/i18n/config';

const localeLabels: Record<Locale, { label: string; flag: string; name: string }> = {
  en: { label: 'EN', flag: 'GB', name: 'English' },
  cs: { label: 'CS', flag: 'CZ', name: 'Čeština' },
};

/**
 * Language switcher component that toggles between available locales.
 * Stores preference in localStorage and syncs to cookie for SSR.
 */
export function LanguageSwitcher() {
  const currentLocale = useLocale() as Locale;
  const t = useTranslations('header');

  const switchLocale = (newLocale: Locale) => {
    if (newLocale === currentLocale) return;

    // Save to localStorage
    localStorage.setItem('locale', newLocale);

    // Sync to cookie for SSR
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000;SameSite=Lax`;

    // Reload to apply new locale
    window.location.reload();
  };

  const nextLocale = currentLocale === 'en' ? 'cs' : 'en';

  return (
    <button
      onClick={() => switchLocale(nextLocale)}
      className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-muted transition-colors"
      title={t('switchLanguage', { lang: localeLabels[nextLocale].name })}
    >
      <Languages className="h-4 w-4" />
      <span>{localeLabels[currentLocale].label}</span>
    </button>
  );
}
