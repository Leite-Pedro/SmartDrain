"use client";
import { API } from "@/lib/api";

import { ThemeToggle } from "@/components/ThemeToggle";
import dynamic from "next/dynamic";
import { ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

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
  status_codigo: "TRANQUILO" | "ALERTA" | "CRITICO" | "ENCHENTE";
  status_mensagem: string;
  status_bateria: number;
  timestamp: string;
}

const MapComponent = dynamic(() => import("@/components/Map"), { ssr: false });

export default function Home() {
  const [bueiros, setBueiros] = useState<BueiroData[]>([]);

  useEffect(() => {
    const fetchTelemetria = async () => {
      try {
        // 🚀 EVITA CACHE DO NAVEGADOR
        const response = await fetch(
          `${API}/api/bueiros/tempo-real?_t=${Date.now()}`,
          { cache: "no-store" },
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

  // Filtra alertas ativos (ENCHENTE, CRITICO e ALERTA)
  const alertasAtivos = bueiros.filter(
    (b) =>
      b.status_codigo === "ENCHENTE" ||
      b.status_codigo === "CRITICO" ||
      b.status_codigo === "ALERTA",
  );

  return (
    <div className="flex h-screen bg-app-bg text-app-text transition-colors duration-300">
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 flex items-center px-8 relative bg-app-surface">
          <h2 className="text-blue-600 font-black text-3xl tracking-wide uppercase absolute left-[40%] -translate-x-1/2">
            Smart Drain
          </h2>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        <section className="p-4 flex-1 grid grid-cols-5 gap-4">
          <div className="col-span-4 h-full bg-app-surface rounded-3xl border overflow-hidden shadow-xl">
            <MapComponent bueiros={bueiros} />
          </div>

          <div className="col-span-1 bg-app-surface/50 rounded-3xl border p-5 shadow-sm flex flex-col overflow-hidden">
            <h3 className="text-[10px] font-black uppercase mb-4 flex items-center gap-2 shrink-0">
              <ShieldAlert size={14} className="text-red-500" />
              Alertas Ativos
            </h3>

            <div className="flex flex-col gap-3 overflow-y-auto pr-1 flex-1">
              {alertasAtivos.length > 0 ? (
                alertasAtivos.map((alerta) => (
                  <div
                    key={alerta.bueiro_id}
                    className={`p-3 border rounded-xl flex flex-col gap-1 transition-all duration-300 ${
                      alerta.status_codigo === "ENCHENTE"
                        ? "bg-blue-500/10 border-blue-500/30 text-blue-500"
                        : alerta.status_codigo === "CRITICO"
                          ? "bg-red-500/10 border-red-500/20 text-red-600"
                          : "bg-yellow-500/10 border-yellow-500/20 text-yellow-600"
                    }`}
                  >
                    <p className="text-xs font-bold uppercase">
                      {alerta.status_codigo}: {alerta.capacidade_porcentagem}%
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
                  Nenhum bueiro crítico ou em alerta no momento
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
