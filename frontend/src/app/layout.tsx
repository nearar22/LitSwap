import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import dynamic from "next/dynamic";
import { Header } from "@/components/layout/Header";

const Providers = dynamic(() => import("./providers").then((m) => m.Providers), { ssr: false });

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LitSwap | DEX on LitVM",
  description: "The first decentralized exchange on LitVM - swap, earn, and provide liquidity with zkLTC.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col justify-between">
            <Header />
            <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
              {children}
            </main>
            <footer className="border-t border-white/5 py-6 text-center text-sm text-slate-500">
              <p>LitSwap | Powered by <span className="text-purple-400">LitVM</span> • Built on Litecoin</p>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
