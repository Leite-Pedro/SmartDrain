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

interface Dispositivo {
  id: string;
  localizacao: string;
  bateria: number;
  sinal: number; // Em porcentagem (0 a 100)
  status: "online" | "warning" | "offline";
  ultimaAtualizacao: string;
}

const mockDispositivos: Dispositivo[] = [
  {
    id: "SD-BUEIRO-01",
    localizacao: "Avenida Central - Esquina 1",
    bateria: 85,
    sinal: 92,
    status: "online",
    ultimaAtualizacao: "Agora mesmo",
  },
  {
    id: "SD-BUEIRO-02",
    localizacao: "Rua das Flores - Próximo ao parque",
    bateria: 30,
    sinal: 45,
    status: "warning",
    ultimaAtualizacao: "Há 5 min",
  },
  {
    id: "SD-BUEIRO-03",
    localizacao: "Centro Histórico - Praça",
    bateria: 5,
    sinal: 10,
    status: "offline",
    ultimaAtualizacao: "Há 2 horas",
  },
  {
    id: "SD-BUEIRO-04",
    localizacao: "Bairro Industrial - Setor B",
    bateria: 100,
    sinal: 88,
    status: "online",
    ultimaAtualizacao: "Há 1 min",
  },
];

export default function Dispositivos() {
  const [dispositivos, setDispositivos] =
    useState<Dispositivo[]>(mockDispositivos);

  // =========================================================================
  // PREPARAÇÃO PARA RECEBER DADOS REAIS (IoT) - DEIXE COMENTADO POR ENQUANTO
  // =========================================================================
  /*
  useEffect(() => {
    const fetchDadosReais = async () => {
      try {
        // Substitua a URL abaixo pela API do seu servidor/broker MQTT
        const response = await fetch('https://sua-api.com/api/devices');
        const data = await response.json();
        
        // Mapeia os dados reais para o formato da interface Dispositivo
        const dispositivosFormatados = data.map((item: any) => ({
          id: item.deviceId,
          localizacao: item.locationName,
          bateria: item.batteryLevel,
          sinal: item.signalQuality,
          status: item.isOnline ? "online" : "offline",
          ultimaAtualizacao: new Date(item.lastSeen).toLocaleTimeString()
        }));

        setDispositivos(dispositivosFormatados);
      } catch (error) {
        console.error("Erro ao buscar dados dos dispositivos IoT:", error);
      }
    };

    // Atualiza a cada 30 segundos
    // const intervalo = setInterval(fetchDadosReais, 30000);
    // return () => clearInterval(intervalo);
  }, []);
  */
  // =========================================================================

  // Função auxiliar para renderizar o ícone de bateria correto
  const getBatteryIcon = (nivel: number) => {
    if (nivel > 60) return <Battery className="text-emerald-500" size={24} />;
    if (nivel > 20)
      return <BatteryMedium className="text-yellow-500" size={24} />;
    return <BatteryWarning className="text-red-500 animate-pulse" size={24} />;
  };

  // Função auxiliar para cor da barra de progresso
  const getProgressColor = (valor: number, tipo: "bateria" | "sinal") => {
    if (valor > 60) return "bg-emerald-500";
    if (valor > 20) return "bg-yellow-500";
    return "bg-red-500";
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
            Monitoramento de bateria e qualidade de rede 4G dos nós sensores.
          </p>
        </div>
      </div>

      {/* Grid de Dispositivos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dispositivos.map((disp) => (
          <div
            key={disp.id}
            className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all"
          >
            {/* Topo do Card */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">
                  {disp.id}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {disp.localizacao}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  disp.status === "online"
                    ? "bg-emerald-500/10 text-emerald-600"
                    : disp.status === "warning"
                      ? "bg-yellow-500/10 text-yellow-600"
                      : "bg-red-500/10 text-red-600"
                }`}
              >
                {disp.status.toUpperCase()}
              </span>
            </div>

            <div className="space-y-5 mt-6">
              {/* Indicador de Bateria */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    {getBatteryIcon(disp.bateria)}
                    <span className="text-sm font-semibold">Bateria</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {disp.bateria}%
                  </span>
                </div>
                {/* Barra de Progresso */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${getProgressColor(disp.bateria, "bateria")}`}
                    style={{ width: `${disp.bateria}%` }}
                  ></div>
                </div>
              </div>

              {/* Indicador de Sinal 4G */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    {disp.sinal > 50 ? (
                      <SignalHigh className="text-blue-500" size={24} />
                    ) : (
                      <SignalLow className="text-red-500" size={24} />
                    )}
                    <span className="text-sm font-semibold">Sinal 4G</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {disp.sinal}%
                  </span>
                </div>
                {/* Barra de Progresso */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${getProgressColor(disp.sinal, "sinal")}`}
                    style={{ width: `${disp.sinal}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Rodapé do Card */}
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-400 text-center">
                Último ping: {disp.ultimaAtualizacao}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
