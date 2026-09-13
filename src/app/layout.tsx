import type { Metadata } from "next";
import { Public_Sans, Zen_Kaku_Gothic_New, Azeret_Mono, Noto_Sans_JP, Kalam } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { assertEnv } from "@/lib/env";
import "./globals.css";

// Runs once per cold start, before anything touches the database or a
// session cookie — a misconfigured deploy fails here with a clear message
// instead of a mysterious 500 on first request.
assertEnv();

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * The reference's exact stack. Japanese faces carry thousands of glyphs, so
 * `display: swap` and subsetting matter more here than on a Latin-only site —
 * this was the single biggest performance risk flagged in the research.
 */
const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-public-sans",
  display: "swap",
});

const zenKaku = Zen_Kaku_Gothic_New({
  weight: ["400", "500", "700", "900"],
  subsets: ["latin"],
  variable: "--font-zen-kaku",
  display: "swap",
  preload: false,
});

const azeret = Azeret_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-azeret",
  display: "swap",
});

/** 小生 brand: body copy on the public site. */
const notoSansJP = Noto_Sans_JP({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
  display: "swap",
  preload: false,
});

/** 小生 brand: the handwritten role — logo, category labels, dates. */
const kalam = Kalam({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-kalam",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "小生",
    template: "%s — 小生",
  },
  description: "ちょっとレトロ、ちょっと旅、ちょっとヘン。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body
        className={`${publicSans.variable} ${zenKaku.variable} ${azeret.variable} ${notoSansJP.variable} ${kalam.variable}`}
      >
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
