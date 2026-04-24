"use client";

import { useState } from "react";
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area 
} from "recharts";

// Dados simulados para vermos os gráficos funcionando
const dataMock = [
  { mes: "Jan", limpezas: 2, enchentes: 0 },
  { mes: "Fev", limpezas: 4, enchentes: 2 },
  { mes: "Mar", limpezas: 1, enchentes: 0 },
  { mes: "Abr", limpezas: 5, enchentes: 3 },
  { mes: "Mai", limpezas: 2, enchentes: 1 },
  { mes: "Jun", limpezas: 3, enchentes: 0 },
];

export default function Historico() {
  // Estado para controlar qual filtro de tempo está ativo
  const [filtroTempo, setFiltroTempo] = useState("1M");

  // Função para mudar a cor do botão ativo
  const btnClass = (filtro: string) => `
    px-4 py-2 rounded-lg text-sm font-medium transition-all
    ${filtroTempo === filtro 
      ? "bg-blue-600 text-white shadow-md" 
      : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"}
  `;

  return (
    <div className="flex-1 bg-slate-950 p-8 h-screen overflow-y-auto">
      
      {/* Cabeçalho e Filtros */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Análise de Dados</h1>
          <p className="text-slate-400 mt-1">Histórico de manutenção e transbordamento</p>
        </div>

        {/* Botões de Filtro de Tempo */}
        <div className="flex gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button onClick={() => setFiltroTempo("1M")} className={btnClass("1M")}>1 Mês</button>
          <button onClick={() => setFiltroTempo("3M")} className={btnClass("3M")}>3 Meses</button>
          <button onClick={() => setFiltroTempo("6M")} className={btnClass("6M")}>6 Meses</button>
          <button onClick={() => setFiltroTempo("12M")} className={btnClass("12M")}>1 Ano</button>
        </div>
      </div>

      {/* Grid dos Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico 1: Índice de Limpeza (Barras) */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">Índice de Limpeza</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataMock}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="mes" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }} />
                <Bar dataKey="limpezas" fill="#2563eb" radius={[4, 4, 0, 0]} name="Limpezas Realizadas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Índice de Enchente (Linha de Alerta) */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">Ocorrências de Enchente</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataMock}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="mes" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }} />
                <Area type="monotone" dataKey="enchentes" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} name="Transbordamentos" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 3: Limpeza X Enchente (Comparativo) - Ocupa 2 colunas em telas grandes */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">Correlação: Limpeza vs Enchente</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataMock}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="mes" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }} />
                <Legend />
                <Line type="monotone" dataKey="limpezas" stroke="#2563eb" strokeWidth={3} name="Ações de Limpeza" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="enchentes" stroke="#ef4444" strokeWidth={3} name="Registros de Enchente" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}