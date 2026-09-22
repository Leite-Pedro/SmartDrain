"use client";
import { API } from "@/lib/api";

import { useState, useEffect, useCallback } from "react";
import { Settings, Bell, Zap, Droplets, Save, Loader2 } from "lucide-react";

interface RegiaoConfig {
  regiao: string;
  limite_critico: number;
  limite_alerta: number;
  proprio: boolean;
  em_vigor: number;
}

interface Configuracoes {
  limite_alerta: number;
  tempestade_ativa: boolean;
  limite_tempestade: number;
  distancia_alerta: number;
  intervalo_tempestade_minutos: number;
  regioes: RegiaoConfig[];
}

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState<Configuracoes | null>(null);
  const [limites, setLimites] = useState<Record<string, number>>({});
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Os bairros vêm dos bueiros que estão publicando, não de uma lista fixa:
  // cadastrar um bueiro num bairro novo faz o controle dele aparecer sozinho.
  const buscar = useCallback(async () => {
    try {
      const resposta = await fetch(`${API}/api/configuracoes`);
      if (!resposta.ok) throw new Error(String(resposta.status));
      const dados: Configuracoes = await resposta.json();
      setConfig(dados);
      setLimites(
        Object.fromEntries(dados.regioes.map((r) => [r.regiao, r.limite_critico])),
      );
      setErro(null);
    } catch {
      setErro(`Sem resposta da API em ${API}.`);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    buscar();
  }, [buscar]);

  // Só envia o que a pessoa mexeu, um pedido por bairro alterado.
  const salvar = async () => {
    if (!config) return;
    setSalvando(true);
    try {
      const mudados = config.regioes.filter(
        (r) => limites[r.regiao] !== r.limite_critico,
      );
      for (const r of mudados) {
        await fetch(`${API}/api/configuracoes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ regiao: r.regiao, limite: limites[r.regiao] }),
        });
      }
      await buscar();
    } catch {
      setErro("Falha ao salvar. Veja se a API continua no ar.");
    } finally {
      setSalvando(false);
    }
  };

  const alternarTempestade = async () => {
    if (!config) return;
    const ligando = !config.tempestade_ativa;
    if (
      ligando &&
      !confirm(
        `Durante a tempestade todos os bairros passam a alertar a partir de ` +
          `${config.limite_tempestade}%, e os bueiros medem a cada ` +
          `${config.intervalo_tempestade_minutos} min (mais consumo de bateria). Continuar?`,
      )
    ) {
      return;
    }
    try {
      await fetch(`${API}/api/comandos/tempestade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ativo: ligando,
          intervalo_minutos: config.intervalo_tempestade_minutos,
        }),
      });
      await buscar();
    } catch {
      setErro("Falha ao comunicar com os dispositivos.");
    }
  };

  if (carregando) {
    return (
      <div className="flex-1 p-8 h-full flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  const tempestade = config?.tempestade_ativa ?? false;
  const alterou =
    config?.regioes.some((r) => limites[r.regiao] !== r.limite_critico) ?? false;

  return (
    <div className="flex-1 p-8 h-full overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
          <Settings className="text-blue-600" />
          Configurações do Sistema
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Cada bairro tem o seu limite: o que fica em fundo de vale enche antes,
          e um número só para a cidade inteira não serve aos dois.
        </p>
      </div>

      <div className="max-w-4xl space-y-6">
        {erro && (
          <p className="text-sm text-red-500" role="alert">
            {erro}
          </p>
        )}

        {/* Limites por bairro */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Droplets className="text-blue-500" />
            <h2 className="text-xl font-bold">Limite de alerta por bairro</h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            A porcentagem de obstrução em que o bueiro entra em crítico. O alerta
            vem sempre {config?.distancia_alerta}&nbsp;pontos abaixo, então baixar
            um arrasta o outro junto.
          </p>

          {tempestade && (
            <p className="text-sm text-orange-500 mb-5 font-medium">
              Modo tempestade ligado: todos os bairros estão valendo{" "}
              {config?.limite_tempestade}% agora. Os valores abaixo voltam a valer
              quando você desligar.
            </p>
          )}

          <div className="space-y-6">
            {config?.regioes.length === 0 && (
              <p className="text-sm text-slate-500">
                Nenhum bueiro publicando ainda — os bairros aparecem aqui sozinhos
                assim que chegar telemetria.
              </p>
            )}

            {config?.regioes.map((r) => (
              <div key={r.regiao}>
                <label className="flex items-baseline justify-between mb-2 gap-3">
                  <span className="text-sm font-medium">
                    Limite de Alerta Crítico{" "}
                    <span className="font-bold capitalize">
                      {r.regiao.toLowerCase()}
                    </span>
                    :{" "}
                    <span className="text-blue-600 font-bold">
                      {limites[r.regiao]}%
                    </span>
                  </span>
                  <span className="text-xs text-slate-400 shrink-0">
                    alerta em {limites[r.regiao] - (config?.distancia_alerta ?? 15)}%
                    {tempestade && ` · em vigor: ${r.em_vigor}%`}
                  </span>
                </label>
                <input
                  type="range"
                  min="30"
                  max="95"
                  value={limites[r.regiao] ?? r.limite_critico}
                  onChange={(e) =>
                    setLimites({ ...limites, [r.regiao]: Number(e.target.value) })
                  }
                  disabled={tempestade}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-40 disabled:cursor-not-allowed"
                />
              </div>
            ))}

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={salvar}
                disabled={salvando || tempestade || !alterou}
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

        {/* Modo tempestade */}
        <div
          className={`p-6 rounded-3xl border ${
            tempestade
              ? "bg-orange-500/20 border-orange-500/40"
              : "bg-orange-500/10 border-orange-500/20"
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-orange-600 dark:text-orange-400">
              <Zap size={24} className={tempestade ? "animate-pulse" : ""} />
              <div>
                <h3 className="font-bold">
                  Modo de Alta Prioridade (Tempestade)
                  {tempestade && " — ATIVO"}
                </h3>
                <p className="text-sm opacity-80">
                  Todos os bairros passam a alertar a partir de{" "}
                  {config?.limite_tempestade}% (alerta em{" "}
                  {(config?.limite_tempestade ?? 60) -
                    (config?.distancia_alerta ?? 15)}
                  %) e os bueiros medem a cada{" "}
                  {config?.intervalo_tempestade_minutos} min.
                </p>
              </div>
            </div>
            <button
              onClick={alternarTempestade}
              className={`shrink-0 transition-colors text-white px-4 py-2 rounded-lg font-bold text-sm ${
                tempestade
                  ? "bg-slate-600 hover:bg-slate-700"
                  : "bg-orange-500 hover:bg-orange-600"
              }`}
            >
              {tempestade ? "DESATIVAR" : "ATIVAR AGORA"}
            </button>
          </div>
        </div>

        {/* Notificações */}
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
