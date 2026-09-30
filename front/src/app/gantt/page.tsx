'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Navbar } from '../../components/layout/Navbar';
import { Sidebar } from '../../components/layout/Sidebar';
import { GanttChart } from '../../components/gantt/GanttChart';
import { TaskModal } from '../../components/tasks/TaskModal';
import { Task } from '../../types';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import * as XLSX from 'xlsx';
import { formatDate } from '../../lib/utils';
import {
  CalendarRange,
  Search,
  RefreshCw,
  Plus,
  AlertCircle,
  Clock,
  CheckCircle2,
  User,
  Users,
  Download,
  Sparkles,
  Lock,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

export default function GanttPage() {
  const { isAuthenticated, loading: authLoading, user: currentUser } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('todas');
  const [teamFilter, setTeamFilter] = useState('todas');
  const [privacyFilter, setPrivacyFilter] = useState('todas'); // 'todas', 'minhas', 'compartilhadas_comigo'
  const [orderMode, setOrderMode] = useState<'personal' | 'global'>('personal');

  // Toast
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Buscar tarefas
  const fetchTasks = useCallback(
    async (silent: boolean = false) => {
      if (!isAuthenticated) {
        setTasks([]);
        setIsLoading(false);
        return;
      }

      try {
        if (!silent) setIsLoading(true);
        const res = await api.get('/tasks');
        const data = Array.isArray(res.data) ? res.data : res.data.tarefas || [];
        setTasks(data);
      } catch (err: any) {
        console.error('Erro ao buscar tarefas:', err);
        showToast('error', 'Falha ao sincronizar tarefas com o servidor.');
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [isAuthenticated]
  );

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) {
      fetchTasks();
    } else {
      setTasks([]);
      setIsLoading(false);
    }
  }, [authLoading, isAuthenticated, fetchTasks]);

  // Polling silencioso
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    const intervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchTasks(true);
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [isAuthenticated, authLoading, fetchTasks]);

  // Lista de equipes únicas
  const uniqueTeams = useMemo(() => {
    const teams = new Set<string>();
    tasks.forEach((t) => {
      if (t.equipe) teams.add(t.equipe);
    });
    return Array.from(teams);
  }, [tasks]);

  // Filtragem dinâmica das tarefas
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        t.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.equipe.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.nome && t.nome.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesPriority =
        priorityFilter === 'todas' ||
        t.prioridade.toLowerCase() === priorityFilter.toLowerCase();

      const matchesTeam =
        teamFilter === 'todas' || t.equipe.toLowerCase() === teamFilter.toLowerCase();

      let matchesPrivacy = true;
      const isMine = currentUser ? t.id_usuario === currentUser.id_usuario : true;
      if (privacyFilter === 'minhas') {
        matchesPrivacy = isMine;
      } else if (privacyFilter === 'compartilhadas_comigo') {
        matchesPrivacy = !isMine;
      }

      return matchesSearch && matchesPriority && matchesTeam && matchesPrivacy;
    });
  }, [tasks, searchTerm, priorityFilter, teamFilter, privacyFilter, currentUser]);

  // Normalização de status
  const normalizeStatus = (s: string) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const emDesenvolvimentoTasks = filteredTasks.filter((t) => {
    const s = normalizeStatus(t.status);
    return s.includes('desenvolvimento') || s.includes('progresso') || s.includes('andamento');
  });

  const finalizadoTasks = filteredTasks.filter((t) => {
    const s = normalizeStatus(t.status);
    return s.includes('finalizado') || s.includes('conclu') || s.includes('entregue');
  });

  const naoIniciadoTasks = filteredTasks.filter(
    (t) => !emDesenvolvimentoTasks.includes(t) && !finalizadoTasks.includes(t)
  );

  // Ordenação das tarefas para o Gantt (Minha Fila ou Ordem da Equipe)
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      if (orderMode === 'personal') {
        const posA = a.posicaoPessoal !== null && a.posicaoPessoal !== undefined ? a.posicaoPessoal : 999999;
        const posB = b.posicaoPessoal !== null && b.posicaoPessoal !== undefined ? b.posicaoPessoal : 999999;
        if (posA !== posB) return posA - posB;
      } else {
        const ordA = a.ordem !== undefined ? a.ordem : 999999;
        const ordB = b.ordem !== undefined ? b.ordem : 999999;
        if (ordA !== ordB) return ordA - ordB;
      }
      return (b.id_tarefa || 0) - (a.id_tarefa || 0);
    });
  }, [filteredTasks, orderMode]);

  // Exportação Excel
  const handleExportToExcel = () => {
    if (!sortedTasks || sortedTasks.length === 0) {
      showToast('error', 'Nenhuma tarefa encontrada com os filtros atuais para exportar.');
      return;
    }

    try {
      const dataToExport = sortedTasks.map((t) => {
        const isMine = currentUser ? t.id_usuario === currentUser.id_usuario : true;
        let privacyLabel = 'Privada (Minha)';
        if (t.isCompartilhada) {
          privacyLabel = isMine ? 'Compartilhada por mim' : 'Compartilhada comigo';
        }

        return {
          'ID': t.id_tarefa,
          'Descrição da Tarefa': t.descricao,
          'Equipe / Squad': t.equipe,
          'Prioridade': (t.prioridade || '').toUpperCase(),
          'Status': t.status,
          'Previsão de Início': t.data_previsao_inicio ? formatDate(t.data_previsao_inicio) : '—',
          'Data de Início': t.data_inicio ? formatDate(t.data_inicio) : '—',
          'Previsão de Término': t.data_previsao_fim ? formatDate(t.data_previsao_fim) : '—',
          'Data de Conclusão': t.data_conclusao ? formatDate(t.data_conclusao) : 'Pendente',
          'Responsável / Criador': t.nome || 'Não atribuído',
          'E-mail': t.email || '',
          'Tipo de Acesso': privacyLabel,
          'Data de Cadastro': formatDate(t.data_cadastro),
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      worksheet['!cols'] = [
        { wch: 8 },  // ID
        { wch: 40 }, // Descrição
        { wch: 18 }, // Equipe
        { wch: 14 }, // Prioridade
        { wch: 22 }, // Status
        { wch: 20 }, // Previsão Início
        { wch: 20 }, // Data Início
        { wch: 20 }, // Previsão Fim
        { wch: 20 }, // Data de Conclusão
        { wch: 24 }, // Responsável
        { wch: 28 }, // E-mail
        { wch: 26 }, // Tipo de Acesso
        { wch: 20 }, // Data Cadastro
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Cronograma_Gantt');

      const now = new Date();
      const dateFormatted = now.toISOString().slice(0, 10);
      const fileName = `Cronograma_Gantt_${dateFormatted}.xlsx`;

      XLSX.writeFile(workbook, fileName);
      showToast('success', `${sortedTasks.length} tarefas exportadas para Excel com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao exportar Excel:', err);
      showToast('error', 'Ocorreu um erro ao gerar o arquivo Excel.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 ${
              toastMessage.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-rose-600 text-white border-rose-500'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Navbar
          onOpenNewTask={() => setIsTaskModalOpen(true)}
          onToggleMobile={() => setIsMobileMenuOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Header & New Task Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Painel de Gestão de Projetos</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Gráfico de Gantt
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Visualize o cronograma, dependências temporais e o progresso em linha do tempo das tarefas.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => setIsTaskModalOpen(true)}
                className="flex items-center gap-2 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Nova Tarefa</span>
              </Button>
            </div>
          </div>

          {/* Metrics Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Não Iniciadas
                </span>
                <span className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-black text-slate-700">{naoIniciadoTasks.length}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Aguardando início</div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Em Andamento
                </span>
                <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                  <Clock className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-black text-amber-600">
                {emDesenvolvimentoTasks.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Em desenvolvimento</div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Finalizadas
                </span>
                <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-black text-emerald-600">
                {finalizadoTasks.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Entregues com sucesso</div>
            </div>
          </div>

          {/* Filter & Controls Toolbar */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar tarefas no cronograma..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 rounded-lg border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Order Mode Toggle (Minha Fila Pessoal vs Ordem da Equipe) */}
              <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setOrderMode('personal')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-md transition-all ${
                    orderMode === 'personal'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Fila Pessoal: sua ordem personalizada de priorização"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Minha Fila</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderMode('global')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-md transition-all ${
                    orderMode === 'global'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Ordem da Equipe: sequência universal compartilhada"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Ordem da Equipe</span>
                </button>
              </div>

              {/* Privacy Filter */}
              <select
                value={privacyFilter}
                onChange={(e) => setPrivacyFilter(e.target.value)}
                className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="todas">Todas as Tarefas</option>
                <option value="minhas">Criadas por Mim</option>
                <option value="compartilhadas_comigo">Compartilhadas Comigo</option>
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="todas">Todas as Prioridades</option>
                <option value="alta">Alta</option>
                <option value="média">Média</option>
                <option value="baixa">Baixa</option>
              </select>

              {/* Team Filter */}
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="todas">Todas as Equipes</option>
                {uniqueTeams.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>

              {/* Refresh Button */}
              <button
                onClick={() => fetchTasks()}
                title="Atualizar cronograma"
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
              </button>

              {/* Export to Excel Button (Download Icon) */}
              <button
                onClick={handleExportToExcel}
                title={`Exportar ${sortedTasks.length} tarefas filtradas para Excel (.xlsx)`}
                className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg border border-slate-200 transition-colors"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Gantt Chart Component */}
          {isLoading ? (
            <div className="py-24 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-xs font-semibold text-slate-400">Carregando cronograma...</p>
            </div>
          ) : (
            <GanttChart
              tasks={sortedTasks}
              onRefresh={fetchTasks}
            />
          )}
        </main>
      </div>

      {/* Modal de Criação / Edição de Tarefas */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={() => {
          fetchTasks();
          showToast('success', 'Tarefa criada com sucesso!');
        }}
      />
    </div>
  );
}
