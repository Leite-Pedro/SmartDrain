"use client";

import { useState, useEffect } from "react";
import {
  Battery,
  BatteryMedium,
  BatteryWarning,
  SignalHigh,
  SignalLow,
  Activity,
} from "lucide-react";

// Tipagem baseada exatamente no JSON que o Flask está enviando
interface BueiroData {
  bueiro_id: string;
  latitude: number;
  longitude: number;
  status_bateria: number;
  qualidade_conexao: string;
  status_codigo: "TRANQUILO" | "ALERTA" | "CRITICO";
  timestamp: string;
}

export default function Dispositivos() {
  const [dispositivos, setDispositivos] = useState<BueiroData[]>([]);

  // =========================================================================
  // CONSUMO DE DADOS REAIS DA API FLASK
  // =========================================================================
  useEffect(() => {
    const fetchDadosReais = async () => {
      try {
        const response = await fetch(
          "http://127.0.0.1:5000/api/bueiros/tempo-real",
        );
        if (response.ok) {
          const data = await response.json();
          setDispositivos(data);
        }
      } catch (error) {
        console.error("Erro ao buscar dados dos dispositivos IoT:", error);
      }
    };

    fetchDadosReais(); // Busca imediata
    const intervalo = setInterval(fetchDadosReais, 5000); // Atualiza a cada 5 segundos

    return () => clearInterval(intervalo);
  }, []);

  // Funções de formatação visual
  const getBatteryIcon = (nivel: number) => {
    if (nivel > 60) return <Battery className="text-emerald-500" size={24} />;
    if (nivel > 20)
      return <BatteryMedium className="text-yellow-500" size={24} />;
    return <BatteryWarning className="text-red-500 animate-pulse" size={24} />;
  };

  const getProgressColor = (valor: number) => {
    if (valor > 60) return "bg-emerald-500";
    if (valor > 20) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Traduz o texto da API em nível matemático para preencher a barra de progresso visual
  const getSignalPercentage = (texto: string) => {
    if (texto.includes("Excelente")) return 100;
    if (texto.includes("Boa")) return 75;
    if (texto.includes("Aceitável")) return 50;
    return 25; // Ruim
  };

  // Adapta o status de negócio da API para a etiqueta visual do Card
  const getStatusDisplay = (status_codigo: string) => {
    switch (status_codigo) {
      case "TRANQUILO":
        return { text: "ONLINE", class: "bg-emerald-500/10 text-emerald-600" };
      case "ALERTA":
        return { text: "WARNING", class: "bg-yellow-500/10 text-yellow-600" };
      case "CRITICO":
        return { text: "OFFLINE", class: "bg-red-500/10 text-red-600" };
      default:
        return { text: "UNKNOWN", class: "bg-slate-500/10 text-slate-600" };
    }
  };

  return (
    <div className="flex-1 p-8 h-full overflow-y-auto">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <Activity className="text-blue-600" />
            Saúde dos Dispositivos
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Monitoramento de bateria e qualidade de rede dos nós sensores.
          </p>
        </div>
      </div>

      {/* Grid Dinâmico: Se houver 5 bueiros, gera 5 cards. Se houver 10, gera 10. */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dispositivos.map((disp) => {
          // Processamentos visuais individuais por card
          const signalLevel = getSignalPercentage(disp.qualidade_conexao);
          const sinalTexto = disp.qualidade_conexao.split(" ")[0]; // Extrai só a primeira palavra (Ex: "Excelente")
          const statusVis = getStatusDisplay(disp.status_codigo);
          const horaUltimoPing = new Date(disp.timestamp).toLocaleTimeString();

          return (
            <div
              key={disp.bueiro_id}
              className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all"
            >
              {/* Topo do Card */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase">
                    {disp.bueiro_id.replace(/_/g, " ")}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                    Lat: {disp.latitude.toFixed(5)} | Lon:{" "}
                    {disp.longitude.toFixed(5)}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${statusVis.class}`}
                >
                  {statusVis.text}
                </span>
              </div>

              <div className="space-y-5 mt-6">
                {/* Indicador de Bateria */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      {getBatteryIcon(disp.status_bateria)}
                      <span className="text-sm font-semibold">Bateria</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {disp.status_bateria}%
                    </span>
                  </div>
                  {/* Barra de Progresso Bateria */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${getProgressColor(disp.status_bateria)}`}
                      style={{ width: `${disp.status_bateria}%` }}
                    ></div>
                  </div>
                </div>

                {/* Indicador de Sinal de Rede */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      {signalLevel > 50 ? (
                        <SignalHigh className="text-blue-500" size={24} />
                      ) : (
                        <SignalLow
                          className="text-red-500 animate-pulse"
                          size={24}
                        />
                      )}
                      <span className="text-sm font-semibold">
                        Sinal da Rede
                      </span>
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase">
                      {sinalTexto}
                    </span>
                  </div>
                  {/* Barra de Progresso Sinal */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${getProgressColor(signalLevel)}`}
                      style={{ width: `${signalLevel}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Rodapé do Card */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-400 text-center">
                  Último ping: {horaUltimoPing}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
