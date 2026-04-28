"use client";

import { ThemeToggle } from "@/components/ThemeToggle";
import dynamic from "next/dynamic";
import { ShieldAlert } from "lucide-react";

const MapComponent = dynamic(() => import("@/components/Map"), { ssr: false });

export default function Home() {
  return (
    <div className="flex h-screen bg-app-bg text-app-text transition-colors duration-300">
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* CABEÇALHO ATUALIZADO */}
        <header className="h-14 flex items-center px-8 relative bg-app-surface">
          {/* Título Absolutamente Centralizado e Aumentado */}
          <h2 className="text-blue-600 font-black text-3xl tracking-wide uppercase absolute left-[40%] -translate-x-1/2">
            Smart Drain
          </h2>

          {/* O ThemeToggle empurrado para o canto direito */}
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        <section className="p-4 flex-1 grid grid-cols-5 gap-4">
          <div className="col-span-4 h-full bg-app-surface rounded-3xl border overflow-hidden shadow-xl">
            <MapComponent />
          </div>

          <div className="col-span-1 bg-app-surface/50 rounded-3xl border p-5 shadow-sm">
            <h3 className="text-[10px] font-black uppercase mb-4 flex items-center gap-2">
              <ShieldAlert size={14} className="text-red-500" />
              Alertas
            </h3>
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-xs font-bold text-red-600">NÍVEL: 85%</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
