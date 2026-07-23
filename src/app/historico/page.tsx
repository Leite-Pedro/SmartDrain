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
import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  Download,
  Calendar,
} from "lucide-react";
import { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function Historico() {
  // 1. Estados para armazenar os dados dinâmicos da API
  const [dadosGrafico, setDadosGrafico] = useState([]);
  const [dadosTabela, setDadosTabela] = useState([]);
  const [isMounted, setIsMounted] = useState(false);

  // Estados para seleção do período do Relatório/Filtro
  const [mesSelecionado, setMesSelecionado] = useState(
    new Date().getMonth() + 1,
  );
  const [anoSelecionado, setAnoSelecionado] = useState(
    new Date().getFullYear(),
  );

  const nomesMeses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  // 2. Busca os dados da API ao montar o componente e quando altera o mês/ano
  useEffect(() => {
    setIsMounted(true);

    const buscarDados = async () => {
      try {
        // Busca os dados da Janela de 6 meses
        const resGraficos = await fetch(
          "http://127.0.0.1:5000/api/historico/graficos",
        );
        if (resGraficos.ok) {
          const jsonGraficos = await resGraficos.json();
          setDadosGrafico(jsonGraficos);
        }

        // Busca os dados da Tabela de Auditoria com filtro de Mês/Ano
        const resAuditoria = await fetch(
          `http://127.0.0.1:5000/api/historico/auditoria?mes=${mesSelecionado}&ano=${anoSelecionado}`,
        );
        if (resAuditoria.ok) {
          const jsonAuditoria = await resAuditoria.json();
          setDadosTabela(jsonAuditoria);
        }
      } catch (error) {
        console.error("Erro ao buscar histórico da API:", error);
      }
    };

    buscarDados();

    // Opcional: Atualiza os dados a cada 10 segundos automaticamente
    const interval = setInterval(buscarDados, 10000);
    return () => clearInterval(interval);
  }, [mesSelecionado, anoSelecionado]);

  // Função para gerar e baixar o CSV dinâmico
  const exportarCSV = () => {
    const nomeMes = nomesMeses[mesSelecionado - 1];
    const agora = new Date();
    const dataHoraEmissao = `${agora.toLocaleDateString("pt-BR")} às ${agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;

    let csvContent = "";

    // Cabeçalho e Metadados da Exportação
    csvContent += `Relatório Bueiros Inteligentes - ${nomeMes} / ${anoSelecionado}\n`;
    csvContent += `Smart Drain - Sistema Inteligente de Monitoramento Urbano\n`;
    csvContent += `Relatório emitido em: ${dataHoraEmissao}\n\n`;

    // Cabeçalhos das Colunas
    csvContent +=
      "Data e Hora,Localidade,Nível Obstrução (%),Status,Ação de Manutenção\n";

    dadosTabela.forEach((row: any) => {
      csvContent += `${row.data},${row.local},${row.nivelMax},${row.status},${row.manutencao}\n`;
    });

    // Adiciona o caractere BOM (\uFEFF) para garantir que acentos abram corretamente no Excel
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `relatorio_bueiros_${nomeMes.toLowerCase()}_${anoSelecionado}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Função para exportar PDF customizado e profissional
  const exportarPDF = () => {
    const doc = new jsPDF();
    const nomeMes = nomesMeses[mesSelecionado - 1];

    // Título Principal
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(
      `Relatório Bueiros Inteligentes - ${nomeMes} / ${anoSelecionado}`,
      105,
      15,
      { align: "center" },
    );

    // Primeiro Subtítulo
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(
      "Smart Drain - Sistema Inteligente de Monitoramento Urbano",
      105,
      21,
      { align: "center" },
    );

    // Segundo Subtítulo: Data e Hora Exatas da Exportação
    const agora = new Date();
    const dataHoraEmissao = `${agora.toLocaleDateString("pt-BR")} às ${agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // Cor Slate 500 (Cinza)
    doc.text(`Relatório emitido em: ${dataHoraEmissao}`, 105, 26, {
      align: "center",
    });

    // Reseta a cor para o padrão da tabela
    doc.setTextColor(0, 0, 0);

    // Estrutura das Colunas
    const colunas = [
      "Data e Hora",
      "Localidade",
      "Nível Obstrução (%)",
      "Status",
      "Ação de Manutenção",
    ];

    // Estrutura das Linhas
    const linhas = dadosTabela.map((item: any) => [
      item.data,
      item.local,
      item.nivelMax,
      item.status,
      item.manutencao,
    ]);

    // Geração da Tabela com Alinhamento Centralizado
    autoTable(doc, {
      startY: 32,
      head: [colunas],
      body: linhas,
      theme: "grid",
      headStyles: {
        fillColor: [30, 41, 59], // Slate 800
        textColor: 255,
        halign: "center",
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: {
        halign: "center", // Centraliza o texto de todas as colunas
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // Slate 50
      },
      margin: { top: 32, bottom: 15 },
    });

    // Baixa o arquivo PDF
    doc.save(
      `relatorio_bueiros_inteligentes_${nomeMes.toLowerCase()}_${anoSelecionado}.pdf`,
    );
  };

  return (
    <div className="flex-1 p-8 h-full overflow-y-auto print:p-0 print:bg-white transition-colors">
      {/* Cabeçalho - Escondido na impressão */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <BarChart3 className="text-blue-600" />
            Análise e Auditoria
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Histórico de operações e indicadores de conformidade governamental.
          </p>
        </div>

        {/* Filtros de Mês/Ano e Botões de Exportação */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Período */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Calendar size={18} className="text-slate-500 ml-2" />
            <select
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(Number(e.target.value))}
              className="bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              {nomesMeses.map((mes, index) => (
                <option
                  key={index}
                  value={index + 1}
                  className="dark:bg-slate-900"
                >
                  {mes}
                </option>
              ))}
            </select>

            <select
              value={anoSelecionado}
              onChange={(e) => setAnoSelecionado(Number(e.target.value))}
              className="bg-transparent text-sm font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer pr-2"
            >
              <option value={2026} className="dark:bg-slate-900">
                2026
              </option>
              <option value={2025} className="dark:bg-slate-900">
                2025
              </option>
            </select>
          </div>

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

      {/* Título Visível apenas no PDF nativo de impressão */}
      <div className="hidden print:block mb-8 text-center border-b pb-4">
        <h1 className="text-2xl font-bold text-black">
          Relatório Bueiros Inteligentes - {nomesMeses[mesSelecionado - 1]} /{" "}
          {anoSelecionado}
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
              <BarChart data={dadosGrafico}>
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
              <AreaChart data={dadosGrafico}>
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
              <LineChart data={dadosGrafico}>
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
          <table className="w-full text-center text-sm text-slate-500 dark:text-slate-400">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-800/50 dark:text-slate-300">
              <tr>
                <th className="px-6 py-3 border-b dark:border-slate-700 text-center">
                  Data e Hora
                </th>
                <th className="px-6 py-3 border-b dark:border-slate-700 text-center">
                  Localidade
                </th>
                <th className="px-6 py-3 border-b dark:border-slate-700 text-center">
                  Nível Obstrução (%)
                </th>
                <th className="px-6 py-3 border-b dark:border-slate-700 text-center">
                  Status
                </th>
                <th className="px-6 py-3 border-b dark:border-slate-700 text-center">
                  Ação / Manutenção
                </th>
              </tr>
            </thead>
            <tbody>
              {dadosTabela.map((item: any, index) => (
                <tr
                  key={index}
                  className="border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white text-center">
                    {item.data}
                  </td>
                  <td className="px-6 py-4 text-center">{item.local}</td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        parseFloat(String(item.nivelMax).replace(",", ".")) > 80
                          ? "bg-red-500/10 text-red-600"
                          : "bg-emerald-500/10 text-emerald-600"
                      }`}
                    >
                      {item.nivelMax}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">{item.status}</td>
                  <td className="px-6 py-4 text-center">{item.manutencao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
