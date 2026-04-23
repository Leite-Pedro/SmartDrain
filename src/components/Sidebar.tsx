"use client";

import { Map, BarChart3, Settings, LayoutDashboard } from 'lucide-react';
import Image from 'next/image';

export default function Sidebar() {
  return (
    <aside className="w-64 h-screen bg-app-surface text-app-text p-6 flex flex-col border-r border-app-border transition-colors duration-300">
      
      {/* Logo do Projeto - Ícone substituído pela imagem layer8-branco.svg */}
      <div className="flex items-center gap-3 mb-10">
        <Image 
          src="/layer8.svg" 
          alt="Logo Smart Drain" 
          width={48} 
          height={48} 
          style={{ width: '40px', height: 'auto' }}
          className="object-contain scale-[1.666] origin-left ml-2"
          priority 
        />
        <span className="font-black text-xl tracking-tighter uppercase text-blue-600">
          Smart Drain
        </span>
      </div>

      {/* Navegação - Mantendo a integração com o tema */}
      <nav className="flex-1 space-y-2">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-600/10 text-blue-600 font-bold border border-blue-600/20">
          <Map size={20} />
          <span>Mapa de Monitoramento</span>
        </div>
        
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-app-bg transition-all cursor-pointer opacity-70 hover:opacity-100">
          <BarChart3 size={20} />
          <span>Dados em Tempo Real</span>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-app-bg transition-all cursor-pointer opacity-70 hover:opacity-100">
          <Settings size={20} />
          <span>Configurações</span>
        </div>
      </nav>

    </aside>
  );
}