import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import { AccentColorProvider } from "@/components/AccentColorProvider";
import Navbar from "@/components/Navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cognitive Workspace",
  description: "AI-augmented workspace with agent orchestration and semantic retrieval",
  icons: {
    icon: "/golden-owl-logo.png",
    apple: "/golden-owl-logo.png",
  },
};

import { UserAvatarProvider } from "@/components/UserAvatarProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 selection:bg-[var(--accent-color)] selection:text-white">
        <AccentColorProvider>
          <AuthProvider>
            <UserAvatarProvider>
              <Navbar />
              <div className="flex-1 flex flex-col">{children}</div>
            </UserAvatarProvider>
          </AuthProvider>
        </AccentColorProvider>
      </body>
    </html>
  );
}
