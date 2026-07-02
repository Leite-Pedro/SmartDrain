"use client";

import { ThemeToggle } from "@/components/ThemeToggle";
import dynamic from "next/dynamic";
import { ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

// Interface para tipagem correta dos dados do backend
interface BueiroData {
  bueiro_id: string;
  latitude: number;
  longitude: number;
  sensores: {
    sensor_1_cm: number;
    sensor_2_cm: number;
    sensor_3_cm: number;
  };
  distancia_media_cm: number;
  capacidade_porcentagem: number;
  status_codigo: "TRANQUILO" | "ALERTA" | "CRITICO";
  status_mensagem: string;
  status_bateria: number;
  timestamp: string;
}

const MapComponent = dynamic(() => import("@/components/Map"), { ssr: false });

export default function Home() {
  const [bueiros, setBueiros] = useState<BueiroData[]>([]);

  // Busca os dados em tempo real da API Flask a cada 5 segundos
  useEffect(() => {
    const fetchTelemetria = async () => {
      try {
        const response = await fetch(
          "http://127.0.0.1:5000/api/bueiros/tempo-real",
        );
        if (response.ok) {
          const data = await response.json();
          setBueiros(data);
        }
      } catch (error) {
        console.error("Erro ao conectar com a API:", error);
      }
    };

    fetchTelemetria();
    const interval = setInterval(fetchTelemetria, 5000);
    return () => clearInterval(interval);
  }, []);

  // Filtra apenas os bueiros em estado CRITICO para renderizar na aba lateral fixa
  const alertasCriticos = bueiros.filter((b) => b.status_codigo === "CRITICO");

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
            {/* Passando os dados da API direto para o componente do mapa */}
            <MapComponent bueiros={bueiros} />
          </div>

          <div className="col-span-1 bg-app-surface/50 rounded-3xl border p-5 shadow-sm flex flex-col overflow-hidden">
            <h3 className="text-[10px] font-black uppercase mb-4 flex items-center gap-2 shrink-0">
              <ShieldAlert size={14} className="text-red-500" />
              Alertas
            </h3>

            {/* Container com rolagem contida caso existam múltiplos alertas simultâneos */}
            <div className="flex flex-col gap-3 overflow-y-auto pr-1 flex-1">
              {alertasCriticos.length > 0 ? (
                alertasCriticos.map((alerta) => (
                  <div
                    key={alerta.bueiro_id}
                    className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-col gap-1 transition-all duration-300"
                  >
                    <p className="text-xs font-bold text-red-600 uppercase">
                      NÍVEL: {alerta.capacidade_porcentagem}%
                    </p>
                    <p className="text-[11px] font-bold text-slate-300 capitalize">
                      {alerta.bueiro_id.replace(/_/g, " ")}
                    </p>
                    <p className="text-[9px] text-slate-500">
                      Lat: {alerta.latitude.toFixed(5)} | Lon:{" "}
                      {alerta.longitude.toFixed(5)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic text-center mt-4">
                  Nenhum bueiro crítico no momento
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
