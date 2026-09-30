'use client';

import React, { useState, useMemo } from 'react';
import { Task, TaskStatus } from '../../types';
import { TaskColumn } from './TaskColumn';
import { TaskModal } from './TaskModal';
import { TaskDetailModal } from './TaskDetailModal';
import { ConfirmModal } from '../ui/ConfirmModal';
import {
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Lock,
  Globe,
  UserCheck,
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

  // Todas as tarefas que não estão em andamento nem finalizadas entram em Não Iniciado
  const naoIniciadoTasks = filteredTasks.filter(
    (t) => !emDesenvolvimentoTasks.includes(t) && !finalizadoTasks.includes(t)
  );

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

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Visíveis
            </span>
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{filteredTasks.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Suas tarefas e compartilhadas</div>
        </div>

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
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TaskColumn
          status="Não Iniciado"
          title="Não Iniciado"
          tasks={naoIniciadoTasks}
          accentColor="bg-slate-400"
          onEditTask={handleEditClick}
          onDeleteTask={handleDeleteClick}
          onStatusChange={onUpdateStatus}
          onViewDetails={handleViewDetails}
          onAddNewTask={() => onOpenNewTask('Não Iniciado')}
          readCommentsMap={readCommentsMap}
        />

        <TaskColumn
          status="Em Desenvolvimento"
          title="Em Desenvolvimento"
          tasks={emDesenvolvimentoTasks}
          accentColor="bg-amber-500"
          onEditTask={handleEditClick}
          onDeleteTask={handleDeleteClick}
          onStatusChange={onUpdateStatus}
          onViewDetails={handleViewDetails}
          onAddNewTask={() => onOpenNewTask('Em Desenvolvimento')}
          readCommentsMap={readCommentsMap}
        />

        <TaskColumn
          status="Finalizado"
          title="Finalizado"
          tasks={finalizadoTasks}
          accentColor="bg-emerald-500"
          onEditTask={handleEditClick}
          onDeleteTask={handleDeleteClick}
          onStatusChange={onUpdateStatus}
          onViewDetails={handleViewDetails}
          onAddNewTask={() => onOpenNewTask('Finalizado')}
          readCommentsMap={readCommentsMap}
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
    </div>
  );
};
