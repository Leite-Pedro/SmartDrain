"use client";

import { CloudRain, Droplets, Wind, ThermometerSun } from "lucide-react";
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

const dadosClima = [
  { dia: "Seg", volume: 15, probabilidade: 80, temp: 24 },
  { dia: "Ter", volume: 35, probabilidade: 95, temp: 22 }, // Dia de alerta
  { dia: "Qua", volume: 5, probabilidade: 40, temp: 25 },
  { dia: "Qui", volume: 0, probabilidade: 10, temp: 27 },
  { dia: "Sex", volume: 0, probabilidade: 5, temp: 28 },
  { dia: "Sáb", volume: 12, probabilidade: 60, temp: 26 },
  { dia: "Dom", volume: 25, probabilidade: 85, temp: 23 },
];

export default function PrevisaoTempo() {
  // =========================================================================
  // PREPARAÇÃO PARA API REAL (Ex: OpenWeatherMap ou INMET)
  // =========================================================================
  /*
  useEffect(() => {
    const fetchClima = async () => {
      // Coordenadas de Santa Rita do Sapucaí
      // const lat = -22.2567; const lon = -45.7033;
      // const api_key = "SUA_CHAVE_AQUI";
      // const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${api_key}&units=metric`;
      // fetch...
    };
  }, []);
  */
  // =========================================================================

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
              24°C
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
              <ComposedChart data={dadosClima}>
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
                {/* Barras azuis para o volume de chuva (mm) */}
                <Bar
                  yAxisId="left"
                  dataKey="volume"
                  fill="#3b82f6"
                  name="Volume (mm)"
                  radius={[4, 4, 0, 0]}
                />
                {/* Linha vermelha para a probabilidade de chover (%) */}
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

        {/* Alertas e Indicadores (1 coluna) */}
        <div className="space-y-6">
          {/* Alerta de Risco */}
          <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl">
            <div className="flex items-center gap-3 mb-2 text-red-500">
              <CloudRain size={24} />
              <h3 className="font-bold">Alerta para Terça-feira</h3>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400">
              Previsão de <strong className="font-black">35mm</strong> de chuva
              em curto período. Risco elevado de obstrução rápida nos bueiros da
              Avenida Central. Recomendado ativar{" "}
              <strong>Modo Tempestade</strong>.
            </p>
          </div>

          {/* Cards de Métricas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center">
              <Droplets className="text-blue-500 mb-2" size={28} />
              <p className="text-xs text-slate-500">Umidade Relativa</p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                78%
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center">
              <Wind className="text-slate-400 mb-2" size={28} />
              <p className="text-xs text-slate-500">Vento Máx</p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                14 km/h
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
