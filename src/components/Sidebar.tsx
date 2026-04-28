"use client";

import {
  Map,
  BarChart3,
  Settings,
  LayoutDashboard,
  Cpu,
  CloudRain,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 h-screen bg-app-surface text-app-text p-6 flex flex-col transition-colors duration-300">
      {/* Logo Centralizada e Maior - Texto Removido */}
      <Link href="/" className="flex justify-center mb-10 mt-2">
        <Image
          src="/layer8.svg"
          alt="Logo Smart Drain"
          width={50}
          height={50}
          className="object-contain w-48 h-auto drop-shadow-md"
          priority
        />
      </Link>

      {/* Navegação - Mantendo a integração com o tema */}
      <nav className="flex-1 space-y-2">
        <Link
          href="/"
          className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            pathname === "/"
              ? "bg-blue-600/10 text-blue-600 font-bold border border-blue-600/20"
              : "text-slate-400 hover:bg-app-bg opacity-70 hover:opacity-100"
          }`}
        >
          <Map size={20} />
          <span>Mapa de Monitoramento</span>
        </Link>

        <Link
          href="/historico"
          className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            pathname === "/historico"
              ? "bg-blue-600/10 text-blue-600 font-bold border border-blue-600/20"
              : "text-slate-400 hover:bg-app-bg opacity-70 hover:opacity-100"
          }`}
        >
          <BarChart3 size={20} />
          <span>Histórico</span>
        </Link>

        <Link
          href="/previsao"
          className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            pathname === "/previsao"
              ? "bg-blue-600/10 text-blue-600 font-bold border border-blue-600/20"
              : "text-slate-400 hover:bg-app-bg opacity-70 hover:opacity-100"
          }`}
        >
          <CloudRain size={20} />
          <span>Previsão do Tempo</span>
        </Link>

        <Link
          href="/dispositivos"
          className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            pathname === "/dispositivos"
              ? "bg-blue-600/10 text-blue-600 font-bold border border-blue-600/20"
              : "text-slate-400 hover:bg-app-bg opacity-70 hover:opacity-100"
          }`}
        >
          <Cpu size={20} />
          <span>Dispositivos</span>
        </Link>

        <Link
          href="/configuracoes" // 1. Mude de "/" para "/configuracoes"
          className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
            pathname === "/configuracoes" // 2. Adicione a lógica de cor ativa
              ? "bg-blue-600/10 text-blue-600 font-bold border border-blue-600/20"
              : "text-slate-400 hover:bg-app-bg opacity-70 hover:opacity-100"
          }`}
        >
          <Settings size={20} />
          <span>Configurações</span>
        </Link>
      </nav>
    </aside>
  );
}
