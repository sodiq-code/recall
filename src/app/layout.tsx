import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { QueryProvider } from "@/components/recall/query-provider";
import { APP_VERSION, SERVICE_NAME } from "@/lib/constants";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Recall — Your AI, your memory, your rules.",
    template: "%s · Recall",
  },
  description:
    "Recall is the first transparent, controllable memory layer for your ChatGPT agent, built natively on WebMCP. Your AI's memory of you — fully visible, fully editable, fully audited.",
  keywords: [
    "WebMCP",
    "ChatGPT",
    "memory",
    "AI memory",
    "agent memory",
    "audit log",
    "MCP",
    "OpenAI",
  ],
  authors: [{ name: "Recall" }],
  creator: "Recall",
  openGraph: {
    title: "Recall — Your AI, your memory, your rules.",
    description:
      "The first transparent, controllable memory layer for your ChatGPT agent, built natively on WebMCP.",
    type: "website",
    siteName: "Recall",
  },
  twitter: {
    card: "summary_large_image",
    title: "Recall — Your AI, your memory, your rules.",
    description:
      "The first transparent, controllable memory layer for your ChatGPT agent, built natively on WebMCP.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f6f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1612" },
  ],
};

// Exported so server components can read the version without importing env.
export const runtimeVersion = APP_VERSION;
export const serviceName = SERVICE_NAME;
