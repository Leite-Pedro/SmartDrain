"use client";

import { useState } from "react";
import { Settings, Bell, Zap, Droplets, Save } from "lucide-react";

export default function Configuracoes() {
  const [limiteAlerta, setLimiteAlerta] = useState(80);

  return (
    <div className="flex-1 p-8 h-full overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
          <Settings className="text-blue-600" />
          Configurações do Sistema
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Ajuste os parâmetros globais dos microcontroladores e notificações.
        </p>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Seção: Parâmetros de Hardware */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <Droplets className="text-blue-500" />
            <h2 className="text-xl font-bold">Sensores e Alertas</h2>
          </div>

          <div className="space-y-6">
            {/* Controle de Limite de Alerta */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Limite de Alerta Crítico:{" "}
                <span className="text-blue-600 font-bold">{limiteAlerta}%</span>
              </label>
              <input
                type="range"
                min="50"
                max="95"
                value={limiteAlerta}
                onChange={(e) => setLimiteAlerta(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <p className="text-xs text-slate-400 mt-2">
                Define a porcentagem de obstrução necessária para disparar o
                alerta visual no mapa.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() =>
                  alert(
                    "Comando enviado para o Backend (Simulado): Alterar limite para " +
                      limiteAlerta +
                      "%",
                  )
                }
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20"
              >
                <Save size={18} />
                Aplicar aos Dispositivos
              </button>
            </div>
          </div>
        </div>

        {/* Seção: Modo Tempestade (Quick Action) */}
        <div className="bg-orange-500/10 p-6 rounded-3xl border border-orange-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-orange-600 dark:text-orange-400">
              <Zap size={24} />
              <div>
                <h3 className="font-bold">
                  Modo de Alta Prioridade (Tempestade)
                </h3>
                <p className="text-sm opacity-80">
                  Reduz limites e aumenta taxa de atualização para 1min.
                </p>
              </div>
            </div>
            <button className="bg-orange-500 text-white px-4 py-2 rounded-lg font-bold text-sm">
              ATIVAR AGORA
            </button>
          </div>
        </div>

        {/* Seção: Notificações */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm opacity-50 grayscale">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="text-slate-400" />
            <h2 className="text-xl font-bold text-slate-400">
              Notificações (Em breve)
            </h2>
          </div>
          <p className="text-sm text-slate-400">
            Configuração de e-mail e SMS para equipes de manutenção.
          </p>
        </div>
      </div>
    </div>
  );
}
