"use client";

import { useState, useEffect } from "react";
import { Settings, Bell, Zap, Droplets, Save, Loader2 } from "lucide-react";

export default function Configuracoes() {
  const [limiteAlerta, setLimiteAlerta] = useState(80);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  // 1. Busca a configuração atual da API quando a página abre
  useEffect(() => {
    const buscarConfiguracoes = async () => {
      try {
        // Substitua pela rota real da sua API Flask
        const response = await fetch("http://localhost:5000/api/configuracoes");
        if (response.ok) {
          const data = await response.json();
          // Exemplo de retorno da API: { limite_alerta: 65 }
          if (data.limite_alerta) {
            setLimiteAlerta(data.limite_alerta);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar configurações do backend:", error);
      } finally {
        setCarregando(false);
      }
    };

    buscarConfiguracoes();
  }, []);

  // 2. Envia o novo limite de alerta para a API
  const salvarConfiguracoes = async () => {
    setSalvando(true);
    try {
      const response = await fetch("http://localhost:5000/api/configuracoes", {
        method: "POST", // ou PUT, dependendo de como você criar no Flask
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ limite_alerta: limiteAlerta }),
      });

      if (response.ok) {
        alert("Parâmetros atualizados com sucesso no Backend!");
      } else {
        alert("Erro ao atualizar parâmetros. Tente novamente.");
      }
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Falha na comunicação com a API.");
    } finally {
      setSalvando(false);
    }
  };

  // 3. Envia o comando de Modo Tempestade via API (que por sua vez mandará pro MQTT)
  const ativarModoTempestade = async () => {
    if (
      confirm(
        "Isso aumentará o consumo de bateria dos bueiros. Deseja continuar?",
      )
    ) {
      try {
        const response = await fetch(
          "http://localhost:5000/api/comandos/tempestade",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ativo: true, intervalo_minutos: 1 }),
          },
        );

        if (response.ok) {
          alert("Modo Tempestade ATIVADO. Dispositivos notificados via MQTT.");
        }
      } catch (error) {
        console.error("Erro ao ativar tempestade:", error);
        alert("Falha ao comunicar com os dispositivos.");
      }
    }
  };

  if (carregando) {
    return (
      <div className="flex-1 p-8 h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

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
                onClick={salvarConfiguracoes}
                disabled={salvando}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {salvando ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}
                {salvando ? "Aplicando..." : "Aplicar aos Dispositivos"}
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
            <button
              onClick={ativarModoTempestade}
              className="bg-orange-500 hover:bg-orange-600 transition-colors text-white px-4 py-2 rounded-lg font-bold text-sm"
            >
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
