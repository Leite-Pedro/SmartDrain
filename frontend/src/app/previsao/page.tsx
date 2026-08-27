"use client";

import { useState, useEffect } from "react";
import {
  CloudRain,
  Droplets,
  Wind,
  ThermometerSun,
  AlertTriangle,
  Waves,
  Mountain,
} from "lucide-react";
import { API } from "@/lib/api";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  Legend,
} from "recharts";

interface DiaClima {
  dia: string;
  volume: number;
  probabilidade: number;
  temp: number;
}

interface BueiroRisco {
  bueiro_id: string;
  risco: number;
  nivel: "ALTO" | "MEDIO" | "BAIXO";
  altitude_m: number | null;
  capacidade_porcentagem: number;
  fator_terreno: number;
  motivo: string;
}

interface Previsao {
  bueiros: BueiroRisco[];
  chuva_24h_mm: number;
  chuva_72h_mm: number;
  terreno_disponivel: boolean;
  chuva_disponivel: boolean;
}

interface EstadoClima {
  historicoSemanal: DiaClima[];
  tempAtual: number;
  umidadeAtual: number;
  ventoAtual: number;
  alertaDia: string | null;
  alertaVolume: number;
}

// "bueiro_centro_03" não é nome de lugar nenhum.
function nomeLegivel(id: string) {
  const partes = id.split("_");
  return partes.length >= 3 ? `${partes[1]} ${partes[2]}`.toUpperCase() : id.toUpperCase();
}

const CORES_NIVEL: Record<string, string> = {
  ALTO: "bg-red-500/10 text-red-500 border-red-500/20",
  MEDIO: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  BAIXO: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
};

export default function PrevisaoTempo() {
  const [clima, setClima] = useState<EstadoClima | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [previsao, setPrevisao] = useState<Previsao | null>(null);
  const [erroPrevisao, setErroPrevisao] = useState<string | null>(null);

  // Coordenadas fixas de Santa Rita do Sapucaí
  const LAT_SRS = -22.2514;
  const LON_SRS = -45.7031;

  useEffect(() => {
    const buscarDadosMeteorologicos = async () => {
      try {
        // Requisição para dados diários dos próximos 7 dias e dados em tempo real
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT_SRS}&longitude=${LON_SRS}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&daily=precipitation_sum,precipitation_probability_max,temperature_2m_max&timezone=America%2FSao_Paulo`;

        const response = await fetch(url);
        const data = await response.json();

        const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

        // Mapeia os dados da API para o formato esperado pelo Recharts
        const dadosFormatados: DiaClima[] = data.daily.time.map(
          (dataStr: string, index: number) => {
            const dataObjeto = new Date(dataStr + "T12:00:00"); // Evita problemas de fuso horário local
            return {
              dia: diasSemana[dataObjeto.getDay()],
              // 🚀 CORREÇÃO 1: Preserva casas decimais para chuvas leves não virarem 0
              volume: Number(
                (data.daily.precipitation_sum[index] ?? 0).toFixed(1),
              ),
              probabilidade: data.daily.precipitation_probability_max[index],
              temp: Math.round(data.daily.temperature_2m_max[index]),
            };
          },
        );

        // Procura se algum dos dias tem previsão de chuva forte (> 20mm) para gerar o Alerta da Dashboard
        let diaCritico = null;
        let volumeCritico = 0;
        for (let i = 0; i < dadosFormatados.length; i++) {
          if (data.daily.precipitation_sum[i] > 20) {
            const dataObjeto = new Date(data.daily.time[i] + "T12:00:00");
            diaCritico = dataObjeto.toLocaleDateString("pt-BR", {
              weekday: "long",
            });
            volumeCritico = Number(data.daily.precipitation_sum[i].toFixed(1));
            break;
          }
        }

        setClima({
          historicoSemanal: dadosFormatados,
          tempAtual: Math.round(data.current.temperature_2m),
          umidadeAtual: data.current.relative_humidity_2m,
          ventoAtual: Math.round(data.current.wind_speed_10m),
          alertaDia: diaCritico,
          alertaVolume: volumeCritico,
        });
        setLoading(false);
      } catch (error) {
        console.error("Erro ao buscar dados climáticos reais:", error);
        setLoading(false);
      }
    };

    buscarDadosMeteorologicos();
  }, []);

  // O ranking vem da API, não daqui: o app do funcionário lê o mesmo endpoint e
  // os dois precisam mostrar a mesma ordem de atendimento. A obstrução muda a
  // cada leitura do sensor, então recarrega sozinho.
  useEffect(() => {
    const buscarRisco = async () => {
      try {
        const r = await fetch(`${API}/api/previsao/risco`);
        setPrevisao(await r.json());
        setErroPrevisao(null);
      } catch (error) {
        console.error("Erro ao buscar o risco de alagamento:", error);
        // Sem isso a seção fica em "calculando..." para sempre com a API fora.
        setErroPrevisao(`Sem resposta da API em ${API}.`);
      }
    };
    buscarRisco();
    const id = setInterval(buscarRisco, 15000);
    return () => clearInterval(id);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 p-8 h-full flex items-center justify-center">
        <p className="text-slate-500 animate-pulse font-semibold">
          Conectando ao serviço meteorológico de Santa Rita do Sapucaí...
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 h-full overflow-y-auto">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <CloudRain className="text-blue-600" />
            Meteorologia Local
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Previsão para Santa Rita do Sapucaí - MG (Risco de Transbordamento)
          </p>
        </div>

        {/* Card de Resumo Atual */}
        <div className="bg-blue-600/10 border border-blue-600/20 px-6 py-3 rounded-2xl flex items-center gap-4">
          <ThermometerSun className="text-blue-600" size={32} />
          <div>
            <p className="text-xs text-blue-600 font-bold uppercase">Hoje</p>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100">
              {clima?.tempAtual}°C
            </p>
          </div>
        </div>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico Principal (Ocupa 2 colunas) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl lg:col-span-2 transition-colors">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
            Volume vs Probabilidade de Chuva (Próximos 7 dias)
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={clima?.historicoSemanal}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  vertical={false}
                />
                <XAxis dataKey="dia" stroke="#94a3b8" />
                <YAxis
                  yAxisId="left"
                  stroke="#94a3b8"
                  label={{
                    value: "Volume (mm)",
                    angle: -90,
                    position: "insideLeft",
                    fill: "#94a3b8",
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#94a3b8"
                  label={{
                    value: "Probabilidade (%)",
                    angle: 90,
                    position: "insideRight",
                    fill: "#94a3b8",
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e293b",
                    borderColor: "#334155",
                    color: "#f8fafc",
                    borderRadius: "12px",
                  }}
                  itemStyle={{ color: "#f8fafc" }}
                />
                <Legend wrapperStyle={{ paddingTop: "10px" }} />

                {/* 🚀 CORREÇÃO 2: minPointSize={2} garante visibilidade mínima das barras */}
                <Bar
                  yAxisId="left"
                  dataKey="volume"
                  fill="#3b82f6"
                  name="Volume (mm)"
                  radius={[4, 4, 0, 0]}
                  minPointSize={2}
                />

                {/* Linha dinâmica da probabilidade real de chuva */}
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="probabilidade"
                  stroke="#ef4444"
                  strokeWidth={3}
                  name="Probabilidade (%)"
                  dot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alertas e Indicadores Dinâmicos (1 coluna) */}
        <div className="space-y-6">
          {/* Alerta de Risco Inteligente baseado nos milímetros reais */}
          {clima?.alertaDia ? (
            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl">
              <div className="flex items-center gap-3 mb-2 text-red-500">
                <AlertTriangle size={24} className="animate-bounce" />
                <h3 className="font-bold capitalize">
                  Alerta para {clima.alertaDia}
                </h3>
              </div>
              <p className="text-sm text-red-600 dark:text-red-400">
                Previsão acumulada de{" "}
                <strong className="font-black">{clima.alertaVolume}mm</strong>{" "}
                de chuva. Risco elevado de obstrução rápida nos bueiros
                monitorados. Recomendado monitorar a Dashboard com atenção.
              </p>
            </div>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl">
              <div className="flex items-center gap-3 mb-2 text-emerald-500">
                <ThermometerSun size={24} />
                <h3 className="font-bold">Sistema Estável</h3>
              </div>
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                Sem previsões de tempestades severas (acima de 20mm) para os
                próximos 7 dias em Santa Rita do Sapucaí.
              </p>
            </div>
          )}

          {/* Cards de Métricas Reais vindos da API */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center">
              <Droplets className="text-blue-500 mb-2" size={28} />
              <p className="text-xs text-slate-500">Umidade Relativa</p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {clima?.umidadeAtual}%
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center">
              <Wind className="text-slate-400 mb-2" size={28} />
              <p className="text-xs text-slate-500">Velocidade Vento</p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {clima?.ventoAtual} km/h
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Onde vai alagar primeiro */}
      <div className="mt-6 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Waves className="text-blue-600" size={20} />
            Onde vai alagar primeiro
          </h2>
          {previsao && (
            <p className="text-xs text-slate-500 text-right">
              {previsao.chuva_24h_mm.toFixed(1)} mm previstos em 24 h
              <span className="mx-1">·</span>
              {previsao.chuva_72h_mm.toFixed(1)} mm em 72 h
            </p>
          )}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          Pesos: obstrução medida agora 45%, altitude do terreno 35%, chuva
          prevista 20%. A água corre para o ponto mais baixo, então o mesmo
          entupimento pesa mais embaixo do que em cima.
        </p>

        {previsao && !previsao.terreno_disponivel && (
          <p className="text-xs text-amber-500 mb-4">
            Sem altitude do terreno agora — o ranking está saindo só pela
            obstrução e pela chuva.
          </p>
        )}

        {erroPrevisao ? (
          <p className="text-sm text-red-500">{erroPrevisao}</p>
        ) : !previsao ? (
          <p className="text-slate-500 animate-pulse text-sm">
            Calculando o risco por bueiro...
          </p>
        ) : previsao.bueiros.length === 0 ? (
          <p className="text-slate-500 text-sm">Nenhuma telemetria recebida ainda.</p>
        ) : (
          <ol className="space-y-3">
            {previsao.bueiros.map((b, i) => (
              <li
                key={b.bueiro_id}
                className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50"
              >
                <span className="text-2xl font-black text-slate-300 dark:text-slate-700 w-8 text-center shrink-0">
                  {i + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {nomeLegivel(b.bueiro_id)}
                    </p>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${CORES_NIVEL[b.nivel]}`}
                    >
                      {b.nivel}
                    </span>
                    {b.altitude_m !== null && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Mountain size={12} />
                        {b.altitude_m.toFixed(0)} m
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 first-letter:uppercase">
                    {b.motivo}
                  </p>
                  <div className="h-1.5 mt-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        b.nivel === "ALTO"
                          ? "bg-red-500"
                          : b.nivel === "MEDIO"
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                      }`}
                      style={{ width: `${b.risco}%` }}
                    />
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-2xl font-black text-slate-800 dark:text-slate-200 tabular-nums">
                    {b.risco.toFixed(0)}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">
                    risco
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
