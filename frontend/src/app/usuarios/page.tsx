"use client";
import { API } from "@/lib/api";

import { useState, useEffect } from "react";
import {
  UserPlus,
  Users,
  ShieldAlert,
  Key,
  Mail,
  User,
  Trash2,
} from "lucide-react";

export default function CadastroUsuarios() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargo, setCargo] = useState("Operador de Campo");

  // A lista começa vazia
  const [listaUsuarios, setListaUsuarios] = useState<any[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // 1. CARREGAR DADOS: Busca os usuários diretamente da API Flask ao abrir a página
  useEffect(() => {
    setIsMounted(true);
    fetch(`${API}/api/usuarios`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setListaUsuarios(data);
        }
      })
      .catch((err) => console.error("Erro ao buscar usuários do Flask:", err));
  }, []);

  // 2. CADASTRAR DADOS: Envia o novo usuário para a API Flask via POST
  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();

    const novoUsuario = {
      nome,
      email,
      password,
      cargo,
    };

    try {
      const resposta = await fetch(`${API}/api/usuarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(novoUsuario),
      });

      if (resposta.ok) {
        // Pega a resposta do backend (que agora inclui o ID gerado pelo banco de dados)
        const usuarioSalvo = await resposta.json();

        // Atualiza a tabela na tela
        setListaUsuarios([...listaUsuarios, usuarioSalvo]);
        alert(`Usuário ${nome} cadastrado com sucesso!`);

        // Limpa os campos do formulário
        setNome("");
        setEmail("");
        setPassword("");
      } else {
        const erroDados = await resposta.json();
        // ALTERAÇÃO AQUI: Tratamento seguro para capturar a mensagem independente de como o Flask a nomeou (erro, error, message ou mensagem)
        const mensagemFinal =
          erroDados.erro ||
          erroDados.error ||
          erroDados.message ||
          erroDados.mensagem ||
          "Erro desconhecido no servidor";
        alert(`Erro: ${mensagemFinal}`);
      }
    } catch (error) {
      alert("Não foi possível conectar ao servidor Flask.");
    }
  };

  // 3. REMOVER DADOS: Deleta o usuário da API Flask via DELETE
  const handleRemover = async (id: number, nomeUsuario: string) => {
    const confirmar = window.confirm(
      `Tem certeza que deseja revogar o acesso de ${nomeUsuario}?`,
    );

    if (confirmar) {
      try {
        const resposta = await fetch(
          `${API}/api/usuarios/${id}`,
          {
            method: "DELETE",
          },
        );

        if (resposta.ok) {
          // Atualiza a tabela na tela removendo o usuário deletado
          const novaLista = listaUsuarios.filter((user) => user.id !== id);
          setListaUsuarios(novaLista);
        } else {
          alert("Erro ao remover usuário do banco.");
        }
      } catch (error) {
        alert("Não foi possível conectar ao servidor Flask.");
      }
    }
  };

  // Previne erros de hydration
  if (!isMounted) return null;

  return (
    <div className="flex-1 p-8 h-full overflow-y-auto transition-colors">
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
          <UserPlus className="text-blue-600" />
          Credenciais do Aplicativo
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Controle de acesso para operadores e fiscais técnicos de Santa Rita do
          Sapucaí.
        </p>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Formulário de Cadastro */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl h-fit">
          <div className="flex items-center gap-2 mb-6 text-blue-600">
            <Key size={20} />
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              Novo Cadastro
            </h2>
          </div>

          <form onSubmit={handleCadastro} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                Nome Completo
              </label>
              <div className="relative">
                <User
                  className="absolute left-3 top-3 text-slate-400"
                  size={18}
                />
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                E-mail institucional
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-3 text-slate-400"
                  size={18}
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@email.com"
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                Senha de Acesso Primário
              </label>
              <div className="relative">
                <Key
                  className="absolute left-3 top-3 text-slate-400"
                  size={18}
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                Nível de Função no App
              </label>
              <select
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="Operador de Campo">
                  Operador de Campo (Limpeza)
                </option>
                <option value="Fiscal Civil">Fiscal Civil (Vistoria)</option>
                <option value="Administrador Geral">Administrador Geral</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/10 transition-all mt-2"
            >
              Liberar Acesso Mobile
            </button>
          </form>
        </div>

        {/* Tabela de Equipe Habilitada */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl xl:col-span-2">
          <div className="flex items-center gap-2 mb-6 text-slate-700 dark:text-slate-300">
            <Users size={20} />
            <h2 className="text-lg font-bold">
              Equipe Habilitada no Aplicativo
            </h2>
          </div>

          <div className="overflow-x-auto">
            {listaUsuarios.length === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                Nenhum operador cadastrado no momento.
              </div>
            ) : (
              <table className="w-full text-left text-sm text-slate-500 dark:text-slate-400">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-800/50 dark:text-slate-300">
                  <tr>
                    <th className="px-6 py-3 border-b dark:border-slate-700">
                      Operador
                    </th>
                    <th className="px-6 py-3 border-b dark:border-slate-700">
                      E-mail Cadastrado
                    </th>
                    <th className="px-6 py-3 border-b dark:border-slate-700 text-center">
                      Permissão
                    </th>
                    <th className="px-6 py-3 border-b dark:border-slate-700 text-center">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {listaUsuarios.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                        {user.nome}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          {user.cargo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleRemover(user.id, user.nome)}
                          title="Revogar Acesso"
                          className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-6 flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-700 dark:text-amber-400 text-xs">
            <ShieldAlert size={20} className="flex-shrink-0 mt-0.5" />
            <p>
              <strong>Atenção de Auditoria:</strong> Qualquer credencial gerada
              nesta tela concede direito de alteração de logs e relatórios de
              campo via API Rest. Certifique-se de validar a identificação
              funcional do servidor municipal antes de concluir o envio para a
              base de dados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
