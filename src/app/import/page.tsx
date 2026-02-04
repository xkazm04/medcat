import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { getVendors } from '@/lib/queries';
import { ImportWizard } from '@/components/import/import-wizard';
import { LanguageSwitcher } from '@/components/language-switcher';

export async function generateMetadata() {
  const t = await getTranslations('import');
  return {
    title: `${t('title')} - MedCatalog`,
  };
}

/**
 * Import page for bulk CSV product import.
 * Server component that fetches vendors and renders the import wizard.
 */
export default async function ImportPage() {
  const vendors = await getVendors();
  const t = await getTranslations();

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center">
          <div className="flex items-center gap-3">
            <div className="w-2 h-6 bg-green-subtle rounded-sm" />
            <h1 className="text-lg font-semibold text-foreground">{t('header.title')}</h1>
          </div>
          <span className="ml-4 text-sm text-muted-foreground">
            {t('header.subtitle')}
          </span>
        </div>
        <LanguageSwitcher />
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('import.backToCatalog')}
        </Link>

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">{t('import.title')}</h1>
          <p className="mt-1 text-muted-foreground">
            {t('import.subtitle')}
          </p>
        </div>

        {/* Wizard card */}
        <div className="bg-card border border-border rounded-lg p-6">
          <ImportWizard vendors={vendors} />
        </div>
      </div>
    </main>
  );
}
