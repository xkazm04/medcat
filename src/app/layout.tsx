import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { QueryProvider } from "@/components/providers/query-provider";
import { LocaleProvider } from "@/components/providers/locale-provider";
import { ToastProvider } from "@/components/ui/toast";
import { type Locale } from "@/i18n/config";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("header");
  return {
    title: `${t("title")} - ${t("metaTitle")}`,
    description: t("metaDescription"),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <LocaleProvider locale={locale} messages={messages}>
          <ToastProvider>
            <QueryProvider>{children}</QueryProvider>
          </ToastProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
