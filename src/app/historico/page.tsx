"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { BarChart3, FileSpreadsheet, FileText, Download } from "lucide-react";
import { useState, useEffect } from "react";

// 1. Dados para os Gráficos
const dataMock = [
  { mes: "Jan", limpezas: 2, enchentes: 0 },
  { mes: "Fev", limpezas: 4, enchentes: 2 },
  { mes: "Mar", limpezas: 1, enchentes: 0 },
  { mes: "Abr", limpezas: 5, enchentes: 3 },
  { mes: "Mai", limpezas: 2, enchentes: 1 },
  { mes: "Jun", limpezas: 3, enchentes: 0 },
];

// 2. Dados para a Tabela e Exportação CSV
const dadosAuditoria = [
  {
    data: "2026-04-20",
    local: "Avenida Central",
    nivelMax: 85,
    status: "Alerta",
    manutencao: "Limpeza Realizada",
  },
  {
    data: "2026-04-21",
    local: "Rua das Flores",
    nivelMax: 40,
    status: "Normal",
    manutencao: "Nenhuma",
  },
  {
    data: "2026-04-22",
    local: "Centro Histórico",
    nivelMax: 95,
    status: "Crítico",
    manutencao: "Desobstrução de Emergência",
  },
  {
    data: "2026-04-25",
    local: "Bairro Industrial",
    nivelMax: 20,
    status: "Normal",
    manutencao: "Vistoria Preventiva",
  },
];

export default function Historico() {
  // Função para gerar e baixar o CSV
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  const exportarCSV = () => {
    let csvContent =
      "Data,Localidade,Nível Máximo (%),Status,Ação de Manutenção\n";

    dadosAuditoria.forEach((row) => {
      csvContent += `${row.data},${row.local},${row.nivelMax},${row.status},${row.manutencao}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "relatorio_manutencao_smartdrain.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Função para exportar PDF (Abre a janela de impressão)
  const exportarPDF = () => {
    window.print();
  };

  return (
    <div className="flex-1 p-8 h-full overflow-y-auto print:p-0 print:bg-white transition-colors">
      {/* Cabeçalho - Escondido na impressão */}
      <div className="flex justify-between items-center mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <BarChart3 className="text-blue-600" />
            Análise e Auditoria
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Histórico de operações e indicadores de conformidade governamental.
          </p>
        </div>

        {/* Botões de Exportação */}
        <div className="flex gap-3">
          <button
            onClick={exportarCSV}
            className="flex items-center gap-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-600 border border-emerald-600/20 px-4 py-2 rounded-xl font-bold transition-all"
          >
            <FileSpreadsheet size={18} />
            CSV
          </button>

          <button
            onClick={exportarPDF}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 px-4 py-2 rounded-xl font-bold transition-all"
          >
            <FileText size={18} />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Título Visível apenas no PDF */}
      <div className="hidden print:block mb-8 text-center border-b pb-4">
        <h1 className="text-2xl font-bold text-black">
          Relatório Oficial de Auditoria - Smart Drain
        </h1>
        <p className="text-slate-600 text-sm">
          Santa Rita do Sapucaí - MG | Emitido em:{" "}
          {isMounted ? new Date().toLocaleDateString() : ""}
        </p>
      </div>

      {/* Grid de Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Gráfico 1: Índice de Limpeza */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm print:shadow-none print:border-slate-300">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">
            Ações de Manutenção
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dataMock}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis dataKey="mes" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Bar
                  dataKey="limpezas"
                  fill="#2563eb"
                  radius={[4, 4, 0, 0]}
                  name="Limpezas"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Índice de Enchente */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm print:shadow-none print:border-slate-300">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">
            Ocorrências de Enchente
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataMock}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis dataKey="mes" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="enchentes"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.1}
                  name="Transbordamentos"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 3: Comparativo (Larga) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm lg:col-span-2 print:shadow-none print:border-slate-300">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 text-center">
            Correlação Operacional
          </h2>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataMock}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  vertical={false}
                />
                <XAxis dataKey="mes" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="limpezas"
                  stroke="#2563eb"
                  strokeWidth={3}
                  name="Limpezas"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="enchentes"
                  stroke="#ef4444"
                  strokeWidth={3}
                  name="Enchentes"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabela de Auditoria - Final da página */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm print:shadow-none print:border-slate-300">
        <div className="flex items-center gap-2 mb-4">
          <FileSpreadsheet className="text-blue-600" size={20} />
          <h2 className="text-lg font-bold">Log de Eventos Detalhados</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-800/50 dark:text-slate-300">
              <tr>
                <th className="px-6 py-3 border-b dark:border-slate-700">
                  Data
                </th>
                <th className="px-6 py-3 border-b dark:border-slate-700">
                  Local
                </th>
                <th className="px-6 py-3 border-b dark:border-slate-700 text-center">
                  Nível Máx.
                </th>
                <th className="px-6 py-3 border-b dark:border-slate-700">
                  Ação / Manutenção
                </th>
              </tr>
            </thead>
            <tbody>
              {dadosAuditoria.map((item, index) => (
                <tr
                  key={index}
                  className="border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                    {item.data}
                  </td>
                  <td className="px-6 py-4">{item.local}</td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        item.nivelMax > 80
                          ? "bg-red-500/10 text-red-600"
                          : "bg-emerald-500/10 text-emerald-600"
                      }`}
                    >
                      {item.nivelMax}%
                    </span>
                  </td>
                  <td className="px-6 py-4">{item.manutencao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
