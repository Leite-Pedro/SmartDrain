import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smart Drain",
  description: "Monitoramento Urbano Inteligente",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // O suppressHydrationWarning é necessário para não dar erro de conflito de cores no console
    <html lang="pt-br" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex h-screen`} //bg-slate-950
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {/* Agora a Sidebar está embrulhada pelo tema */}
          <Sidebar />

          {/* O main abre, o conteúdo entra, o main fecha */}
          <main className="flex-1 h-full overflow-y-auto">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
