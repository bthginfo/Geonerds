import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Footer } from "@/components/layout/footer";
import { CookieBanner } from "@/components/cookie-banner";
import { ServiceWorkerRegister } from "@/components/sw-register";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

const SITE_URL = "https://geo-nerds.com";
const TITLE = "GeoNerds — Geography Games & Quizzes";
const DESCRIPTION =
  "Free geography quizzes and games: guess flags, capitals, country shapes, rivers and more. Play fast, beautiful geography trivia in English & German on desktop and mobile.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · GeoNerds",
  },
  description: DESCRIPTION,
  applicationName: "GeoNerds",
  keywords: [
    "geography quiz",
    "geography games",
    "flag quiz",
    "guess the flag",
    "capitals quiz",
    "country shapes",
    "world map game",
    "geography trivia",
    "Geografie Quiz",
    "Flaggen raten",
    "Hauptstädte Quiz",
    "Länder erraten",
    "Erdkunde Spiel",
    "Weltkarte Quiz",
  ],
  authors: [{ name: "Julius v. Ingelheim" }],
  creator: "Julius v. Ingelheim",
  alternates: {
    canonical: "/",
    languages: { en: "/", de: "/" },
  },
  openGraph: {
    type: "website",
    siteName: "GeoNerds",
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    locale: "en_US",
    alternateLocale: ["de_DE"],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  category: "games",
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "GeoNerds",
  url: SITE_URL,
  description: DESCRIPTION,
  applicationCategory: "GameApplication",
  operatingSystem: "Any",
  inLanguage: ["en", "de"],
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  author: { "@type": "Person", name: "Julius v. Ingelheim" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fb" },
    { media: "(prefers-color-scheme: dark)", color: "#16191f" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
        <Providers>
          <div className="flex min-h-dvh flex-col">
            <Header />
            <main className="flex flex-1 flex-col">{children}</main>
            <Footer />
            <BottomNav />
          </div>
          <CookieBanner />
          <ServiceWorkerRegister />
        </Providers>
      </body>
    </html>
  );
}
