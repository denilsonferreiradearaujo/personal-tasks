'use client';

import React, { useState, useMemo } from 'react';
import { Task, TaskStatus } from '../../types';
import { TaskColumn } from './TaskColumn';
import { TaskModal } from './TaskModal';
import { TaskDetailModal } from './TaskDetailModal';
import { ConfirmModal } from '../ui/ConfirmModal';
import * as XLSX from 'xlsx';
import { formatDate } from '../../lib/utils';
import api from '../../services/api';
import {
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Lock,
  Globe,
  User,
  Users,
  UserCheck,
  Download,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface TaskBoardProps {
  tasks: Task[];
  onRefresh: (silent?: boolean) => void;
  onUpdateStatus: (id: number, status: TaskStatus) => Promise<void>;
  onDeleteTask: (id: number) => Promise<void>;
  onOpenNewTask: (status?: string) => void;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({
  tasks,
  onRefresh,
  onUpdateStatus,
  onDeleteTask,
  onOpenNewTask,
}) => {
  const { user: currentUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('todas');
  const [teamFilter, setTeamFilter] = useState('todas');
  const [privacyFilter, setPrivacyFilter] = useState('todas'); // 'todas', 'minhas', 'compartilhadas_comigo'

  // Modal de edição (formulário tradicional)
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Modal de Detalhes com Feed / Blog / Chat
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Mapa de controle de leitura de comentários por tarefa: { [taskId]: totalLidos }
  const [readCommentsMap, setReadCommentsMap] = useState<{ [key: number]: number }>({});

  // Carregar do localStorage ao iniciar
  React.useEffect(() => {
    if (!currentUser) return;
    const key = `personal_tasks_read_comments_${currentUser.id_usuario}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        setReadCommentsMap(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser]);

  // Função para marcar como lido
  const handleCommentsRead = (taskId: number, total: number) => {
    if (!currentUser) return;
    const key = `personal_tasks_read_comments_${currentUser.id_usuario}`;
    setReadCommentsMap((prev) => {
      const updated = { ...prev, [taskId]: total };
      try {
        localStorage.setItem(key, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Lista única de equipes para filtro
  const uniqueTeams = useMemo(() => {
    const teams = new Set<string>();
    tasks.forEach((t) => {
      if (t.equipe) teams.add(t.equipe);
    });
    return Array.from(teams);
  }, [tasks]);

  // Filtragem dinâmica
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Filtro de texto
      const matchesSearch =
        t.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.equipe.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.nome && t.nome.toLowerCase().includes(searchTerm.toLowerCase()));

      // Filtro de prioridade
      const matchesPriority =
        priorityFilter === 'todas' ||
        t.prioridade.toLowerCase() === priorityFilter.toLowerCase();

      // Filtro de equipe
      const matchesTeam =
        teamFilter === 'todas' || t.equipe.toLowerCase() === teamFilter.toLowerCase();

      // Filtro de privacidade
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

  // Contadores por coluna com normalização resiliente
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

  // Modo de ordenação: Fila Pessoal (individual) vs Ordem da Equipe (global)
  const [orderMode, setOrderMode] = useState<'personal' | 'global'>('personal');

  // Drag and Drop state
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [draggedFromStatus, setDraggedFromStatus] = useState<TaskStatus | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Todas as tarefas que não estão em andamento nem finalizadas entram em Não Iniciado
  const naoIniciadoTasks = filteredTasks.filter(
    (t) => !emDesenvolvimentoTasks.includes(t) && !finalizadoTasks.includes(t)
  );

  // Ordenação personalizada por coluna (Fila Pessoal ou Ordem Global)
  const sortTasks = (taskList: Task[]) => {
    return [...taskList].sort((a, b) => {
      if (orderMode === 'personal') {
        const posA = a.posicaoPessoal !== null && a.posicaoPessoal !== undefined ? a.posicaoPessoal : 999999;
        const posB = b.posicaoPessoal !== null && b.posicaoPessoal !== undefined ? b.posicaoPessoal : 999999;
        if (posA !== posB) return posA - posB;
        return (a.ordem ?? 0) - (b.ordem ?? 0);
      } else {
        return (a.ordem ?? 0) - (b.ordem ?? 0);
      }
    });
  };

  const sortedNaoIniciado = useMemo(() => sortTasks(naoIniciadoTasks), [naoIniciadoTasks, orderMode]);
  const sortedEmDesenvolvimento = useMemo(() => sortTasks(emDesenvolvimentoTasks), [emDesenvolvimentoTasks, orderMode]);
  const sortedFinalizado = useMemo(() => sortTasks(finalizadoTasks), [finalizadoTasks, orderMode]);

  // Drag and Drop handlers
  const handleCardDragStart = (e: React.DragEvent, task: Task, index: number, status: TaskStatus) => {
    e.dataTransfer.setData('text/plain', String(task.id_tarefa));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTask(task);
    setDraggedFromStatus(status);
  };

  const handleCardDragOver = (e: React.DragEvent, index: number, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
    setDragOverIndex(index);
  };

  const handleColumnDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleCardDragEnd = () => {
    setDraggedTask(null);
    setDraggedFromStatus(null);
    setDragOverColumn(null);
    setDragOverIndex(null);
  };

  const handleColumnDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    if (!draggedTask) return;

    const fromStatus = draggedFromStatus;
    const task = draggedTask;
    const toIndex = dragOverIndex;

    handleCardDragEnd();

    const getColumnList = (status: TaskStatus) => {
      const s = normalizeStatus(status);
      if (s.includes('desenvolvimento') || s.includes('progresso') || s.includes('andamento')) {
        return [...sortedEmDesenvolvimento];
      }
      if (s.includes('finalizado') || s.includes('conclu') || s.includes('entregue')) {
        return [...sortedFinalizado];
      }
      return [...sortedNaoIniciado];
    };

    try {
      if (fromStatus === targetStatus) {
        // Reordenação dentro da mesma coluna
        const list = getColumnList(targetStatus);
        const currentIndex = list.findIndex((t) => t.id_tarefa === task.id_tarefa);
        if (currentIndex === -1) return;

        const targetPos = toIndex !== null && toIndex >= 0 ? toIndex : list.length - 1;
        if (currentIndex === targetPos) return;

        const [removed] = list.splice(currentIndex, 1);
        list.splice(targetPos, 0, removed);

        if (orderMode === 'personal') {
          await api.put('/tasks/order/personal', {
            items: list.map((t, idx) => ({ id_tarefa: t.id_tarefa, posicao: idx })),
          });
          showBoardToast('success', 'Fila pessoal reordenada com sucesso!');
        } else {
          await api.put('/tasks/order/global', {
            items: list.map((t, idx) => ({ id_tarefa: t.id_tarefa, ordem: idx })),
          });
          showBoardToast('success', 'Ordem da equipe atualizada com sucesso!');
        }
        onRefresh(true);
      } else {
        // Movimentação entre colunas (troca de status)
        await onUpdateStatus(task.id_tarefa, targetStatus);

        const targetList = getColumnList(targetStatus).filter((t) => t.id_tarefa !== task.id_tarefa);
        const insertPos = toIndex !== null && toIndex >= 0 ? toIndex : targetList.length;
        targetList.splice(insertPos, 0, { ...task, status: targetStatus });

        if (orderMode === 'personal') {
          await api.put('/tasks/order/personal', {
            items: targetList.map((t, idx) => ({ id_tarefa: t.id_tarefa, posicao: idx })),
          });
        } else {
          await api.put('/tasks/order/global', {
            items: targetList.map((t, idx) => ({ id_tarefa: t.id_tarefa, ordem: idx })),
          });
        }
        showBoardToast('success', `Tarefa movida para "${targetStatus}"!`);
        onRefresh(true);
      }
    } catch (err: any) {
      console.error('Erro ao reordenar/mover tarefa:', err);
      showBoardToast('error', err.response?.data?.message || 'Erro ao sincronizar a nova ordem.');
    }
  };

  const handleEditClick = (task: Task) => {
    setEditingTask(task);
    setIsEditModalOpen(true);
  };

  const handleViewDetails = (task: Task) => {
    handleCommentsRead(task.id_tarefa, task.totalComentarios || 0);
    setDetailTask(task);
    setIsDetailModalOpen(true);
  };

  // Estado para exclusão segura com modal padronizado
  const [taskToDeleteId, setTaskToDeleteId] = useState<number | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  const handleDeleteClick = (id: number) => {
    setTaskToDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (!taskToDeleteId) return;
    try {
      setIsDeletingTask(true);
      await onDeleteTask(taskToDeleteId);
      setTaskToDeleteId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeletingTask(false);
    }
  };

  // Toast de feedback para ações do quadro
  const [boardToast, setBoardToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const showBoardToast = (type: 'success' | 'error', text: string) => {
    setBoardToast({ type, text });
    setTimeout(() => setBoardToast(null), 3500);
  };

  // Exportação das tarefas filtradas para Excel (.xlsx)
  const handleExportToExcel = () => {
    if (!filteredTasks || filteredTasks.length === 0) {
      showBoardToast('error', 'Nenhuma tarefa encontrada com os filtros atuais para exportar.');
      return;
    }

    try {
      const dataToExport = filteredTasks.map((t) => {
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
          'Responsável / Criador': t.nome || 'Não atribuído',
          'E-mail': t.email || '',
          'Tipo de Acesso': privacyLabel,
          'Total Comentários / Anexos': t.totalComentarios || 0,
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
        { wch: 24 }, // Responsável
        { wch: 28 }, // E-mail
        { wch: 26 }, // Tipo de Acesso
        { wch: 24 }, // Comentários
        { wch: 20 }, // Data
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Tarefas');

      const now = new Date();
      const dateFormatted = now.toISOString().slice(0, 10);
      const fileName = `Tarefas_PersonalTasks_${dateFormatted}.xlsx`;

      XLSX.writeFile(workbook, fileName);
      showBoardToast('success', `${filteredTasks.length} tarefas exportadas para Excel com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao exportar Excel:', err);
      showBoardToast('error', 'Ocorreu um erro ao gerar o arquivo Excel.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm text-left">
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

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm text-left">
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

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm text-left">
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
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pesquisar por descrição, equipe ou responsável..."
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
              title="Fila Pessoal: organize a sua prioridade pessoal de execução"
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
              title="Ordem da Equipe: sequência universal compartilhada por todos"
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
            onClick={() => onRefresh()}
            title="Atualizar tarefas"
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {/* Export to Excel Button (Download Icon) */}
          <button
            onClick={handleExportToExcel}
            title={`Exportar ${filteredTasks.length} tarefas filtradas para Excel (.xlsx)`}
            className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg border border-slate-200 transition-colors"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TaskColumn
          status="Não Iniciado"
          title="Não Iniciado"
          tasks={sortedNaoIniciado}
          accentColor="bg-slate-400"
          orderMode={orderMode}
          onEditTask={handleEditClick}
          onDeleteTask={handleDeleteClick}
          onStatusChange={onUpdateStatus}
          onViewDetails={handleViewDetails}
          onAddNewTask={() => onOpenNewTask('Não Iniciado')}
          readCommentsMap={readCommentsMap}
          onCardDragStart={handleCardDragStart}
          onCardDragOver={handleCardDragOver}
          onCardDragEnd={handleCardDragEnd}
          onColumnDragOver={handleColumnDragOver}
          onColumnDrop={handleColumnDrop}
          draggedTaskId={draggedTask?.id_tarefa}
          isDragTargetColumn={dragOverColumn === 'Não Iniciado'}
        />

        <TaskColumn
          status="Em Desenvolvimento"
          title="Em Desenvolvimento"
          tasks={sortedEmDesenvolvimento}
          accentColor="bg-amber-500"
          orderMode={orderMode}
          onEditTask={handleEditClick}
          onDeleteTask={handleDeleteClick}
          onStatusChange={onUpdateStatus}
          onViewDetails={handleViewDetails}
          onAddNewTask={() => onOpenNewTask('Em Desenvolvimento')}
          readCommentsMap={readCommentsMap}
          onCardDragStart={handleCardDragStart}
          onCardDragOver={handleCardDragOver}
          onCardDragEnd={handleCardDragEnd}
          onColumnDragOver={handleColumnDragOver}
          onColumnDrop={handleColumnDrop}
          draggedTaskId={draggedTask?.id_tarefa}
          isDragTargetColumn={dragOverColumn === 'Em Desenvolvimento'}
        />

        <TaskColumn
          status="Finalizado"
          title="Finalizado"
          tasks={sortedFinalizado}
          accentColor="bg-emerald-500"
          orderMode={orderMode}
          onEditTask={handleEditClick}
          onDeleteTask={handleDeleteClick}
          onStatusChange={onUpdateStatus}
          onViewDetails={handleViewDetails}
          onAddNewTask={() => onOpenNewTask('Finalizado')}
          readCommentsMap={readCommentsMap}
          onCardDragStart={handleCardDragStart}
          onCardDragOver={handleCardDragOver}
          onCardDragEnd={handleCardDragEnd}
          onColumnDragOver={handleColumnDragOver}
          onColumnDrop={handleColumnDrop}
          draggedTaskId={draggedTask?.id_tarefa}
          isDragTargetColumn={dragOverColumn === 'Finalizado'}
        />
      </div>

      {/* Edit Task Modal */}
      {editingTask && (
        <TaskModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingTask(null);
          }}
          taskToEdit={editingTask}
          onSuccess={onRefresh}
        />
      )}

      {/* Detail & Feed / Chat / Blog Modal */}
      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setDetailTask(null);
          }}
          onTaskUpdated={() => onRefresh(true)}
          onCommentsRead={handleCommentsRead}
        />
      )}

      {/* Modal de Confirmação de Exclusão de Tarefa */}
      <ConfirmModal
        isOpen={taskToDeleteId !== null}
        onClose={() => setTaskToDeleteId(null)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeletingTask}
        title="Excluir Tarefa"
        description="Tem certeza que deseja excluir esta tarefa? Esta ação é definitiva e removerá todos os históricos, anexos e comentários vinculados."
        confirmText="Excluir Tarefa"
        cancelText="Cancelar"
        variant="danger"
      />

      {/* Toast Feedback */}
      {boardToast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            boardToast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {boardToast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{boardToast.text}</span>
        </div>
      )}
    </div>
  );
};
