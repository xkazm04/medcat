'use client';

import { NextIntlClientProvider, AbstractIntlMessages } from 'next-intl';
import { useEffect, type ReactNode } from 'react';
import { type Locale } from '@/i18n/config';

interface LocaleProviderProps {
  children: ReactNode;
  locale: Locale;
  messages: AbstractIntlMessages;
}

/**
 * Locale provider that syncs localStorage preference with cookie for SSR.
 * On first load, checks if localStorage has a different locale than what
 * the server rendered, and if so, triggers a reload with the correct locale.
 */
export function LocaleProvider({ children, locale, messages }: LocaleProviderProps) {
  useEffect(() => {
    // Check if there's a stored locale preference in localStorage
    const storedLocale = localStorage.getItem('locale');

    if (storedLocale && storedLocale !== locale) {
      // User has a different preference stored - sync cookie and reload
      document.cookie = `NEXT_LOCALE=${storedLocale};path=/;max-age=31536000;SameSite=Lax`;
      window.location.reload();
    } else if (!storedLocale) {
      // No stored preference - save the current locale
      localStorage.setItem('locale', locale);
    }
  }, [locale]);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
