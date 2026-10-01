'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Task } from '../../types';
import { formatDate } from '../../lib/utils';
import api from '../../services/api';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  GripVertical,
  CalendarDays,
  Sparkles,
  Maximize2,
} from 'lucide-react';
import { TaskDetailModal } from '../tasks/TaskDetailModal';

interface GanttChartProps {
  tasks: Task[];
  onRefresh: (silent?: boolean) => void;
  onOpenTaskDetails?: (task: Task) => void;
}

type ViewMode = 'days' | 'weeks' | 'months';

interface DragState {
  taskId: number;
  mode: 'move' | 'resize-start' | 'resize-end';
  startX: number;
  initialStartIndex: number;
  initialDurationDays: number;
  currentStartIndex: number;
  currentDurationDays: number;
}

export const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  onRefresh,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('days');
  const [currentOffsetDays, setCurrentOffsetDays] = useState(0);

  // Modal de Detalhes
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Toast de feedback
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  // Referência do container com scroll
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  // Estado de Arraste / Redimensionamento
  const [dragState, setDragState] = useState<DragState | null>(null);

  // Configuração da largura da coluna em pixels por dia conforme o zoom
  const cellWidth = useMemo(() => {
    switch (viewMode) {
      case 'days':
        return 48; // 48px por dia
      case 'weeks':
        return 22; // 22px por dia
      case 'months':
        return 9;  // 9px por dia
      default:
        return 48;
    }
  }, [viewMode]);

  // Cálculo da janela temporal geral
  const { startDate, totalDays, daysArray } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let minTime = today.getTime();
    let maxTime = today.getTime() + 20 * 86400000;

    tasks.forEach((t) => {
      const dStart = t.data_inicio
        ? new Date(t.data_inicio)
        : (t.data_previsao_inicio ? new Date(t.data_previsao_inicio) : (t.data_cadastro ? new Date(t.data_cadastro) : today));
      const dEnd = t.data_conclusao
        ? new Date(t.data_conclusao)
        : (t.data_previsao_fim ? new Date(t.data_previsao_fim) : new Date(dStart.getTime() + 3 * 86400000));
      dStart.setHours(0, 0, 0, 0);
      dEnd.setHours(0, 0, 0, 0);

      if (dStart.getTime() < minTime) minTime = dStart.getTime();
      if (dEnd.getTime() > maxTime) maxTime = dEnd.getTime();
    });

    // Margem de dias antes e depois para navegação confortável
    const baseStart = new Date(minTime - 7 * 86400000);
    baseStart.setHours(0, 0, 0, 0);

    // Aplica o deslocamento da navegação
    const adjustedStart = new Date(baseStart.getTime() + currentOffsetDays * 86400000);

    // Número total de dias visíveis no buffer da timeline
    const durationDaysCount = Math.max(
      60,
      Math.ceil((maxTime - minTime) / 86400000) + 30
    );

    const days: Date[] = [];
    for (let i = 0; i < durationDaysCount; i++) {
      const d = new Date(adjustedStart.getTime() + i * 86400000);
      days.push(d);
    }

    return {
      startDate: adjustedStart,
      totalDays: durationDaysCount,
      daysArray: days,
    };
  }, [tasks, currentOffsetDays]);

  // Identificação do índice do dia "Hoje"
  const todayIndex = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((today.getTime() - startDate.getTime()) / 86400000);
    return diff >= 0 && diff < totalDays ? diff : null;
  }, [startDate, totalDays]);

  // Centralizar visualização em "Hoje"
  const scrollToToday = () => {
    if (timelineScrollRef.current && todayIndex !== null) {
      const targetScroll = todayIndex * cellWidth - timelineScrollRef.current.clientWidth / 2 + 100;
      timelineScrollRef.current.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: 'smooth',
      });
    }
  };

  // Auto-scroll inicial até o dia de hoje
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToToday();
    }, 150);
    return () => clearTimeout(timer);
  }, [viewMode]);

  // Agrupamento dos meses para o cabeçalho superior
  const monthGroups = useMemo(() => {
    const groups: { label: string; daysCount: number }[] = [];
    let currentLabel = '';
    let count = 0;

    daysArray.forEach((day, index) => {
      const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const label = `${monthNames[day.getMonth()]} ${day.getFullYear()}`;

      if (label !== currentLabel) {
        if (currentLabel) {
          groups.push({ label: currentLabel, daysCount: count });
        }
        currentLabel = label;
        count = 1;
      } else {
        count++;
      }

      if (index === daysArray.length - 1) {
        groups.push({ label: currentLabel, daysCount: count });
      }
    });

    return groups;
  }, [daysArray]);

  // Obter cores da barra por status
  const getStatusBarColors = (status: string) => {
    const s = (status || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (s.includes('final') || s.includes('conclu')) {
      return {
        bg: 'bg-emerald-600 hover:bg-emerald-700',
        border: 'border-emerald-700',
        text: 'text-white',
        badge: 'bg-emerald-100 text-emerald-800',
        dot: 'bg-emerald-500',
      };
    }
    if (s.includes('desenvolvimento') || s.includes('progresso') || s.includes('andamento')) {
      return {
        bg: 'bg-amber-500 hover:bg-amber-600',
        border: 'border-amber-600',
        text: 'text-white',
        badge: 'bg-amber-100 text-amber-800',
        dot: 'bg-amber-500',
      };
    }
    return {
      bg: 'bg-blue-600 hover:bg-blue-700',
      border: 'border-blue-700',
      text: 'text-white',
      badge: 'bg-blue-100 text-blue-800',
      dot: 'bg-blue-500',
    };
  };

  // Cálculo da posição de cada tarefa na régua de dias
  const getTaskPosition = (task: Task) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const hasRealStart = !!task.data_inicio;
    const hasRealEnd = !!task.data_conclusao;

    const dStart = task.data_inicio
      ? new Date(task.data_inicio)
      : (task.data_previsao_inicio ? new Date(task.data_previsao_inicio) : (task.data_cadastro ? new Date(task.data_cadastro) : today));
    const dEnd = task.data_conclusao
      ? new Date(task.data_conclusao)
      : (task.data_previsao_fim ? new Date(task.data_previsao_fim) : new Date(dStart.getTime() + 3 * 86400000));
    dStart.setHours(0, 0, 0, 0);
    dEnd.setHours(0, 0, 0, 0);

    let startIndex = Math.round((dStart.getTime() - startDate.getTime()) / 86400000);
    let durationDays = Math.max(1, Math.round((dEnd.getTime() - dStart.getTime()) / 86400000) + 1);

    // Se estiver em modo de arraste nesta tarefa, usamos a posição provisória
    if (dragState && dragState.taskId === task.id_tarefa) {
      startIndex = dragState.currentStartIndex;
      durationDays = Math.max(1, dragState.currentDurationDays);
    }

    const left = startIndex * cellWidth;
    const width = Math.max(cellWidth, durationDays * cellWidth);

    return {
      startIndex,
      durationDays,
      left,
      width,
      dStart,
      dEnd,
      hasRealStart,
      hasRealEnd,
    };
  };

  // Handlers de Arraste (Move e Resize)
  const handleMouseDown = (
    e: React.MouseEvent,
    task: Task,
    mode: 'move' | 'resize-start' | 'resize-end'
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const pos = getTaskPosition(task);

    setDragState({
      taskId: task.id_tarefa,
      mode,
      startX: e.clientX,
      initialStartIndex: pos.startIndex,
      initialDurationDays: pos.durationDays,
      currentStartIndex: pos.startIndex,
      currentDurationDays: pos.durationDays,
    });
  };

  // Sincronização global do mouse durante o arraste
  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragState.startX;
      const deltaDays = Math.round(deltaX / cellWidth);

      if (dragState.mode === 'move') {
        const newStart = dragState.initialStartIndex + deltaDays;
        setDragState((prev) => prev ? {
          ...prev,
          currentStartIndex: newStart,
        } : null);
      } else if (dragState.mode === 'resize-start') {
        const newStart = dragState.initialStartIndex + deltaDays;
        const newDuration = dragState.initialDurationDays - deltaDays;
        if (newDuration >= 1) {
          setDragState((prev) => prev ? {
            ...prev,
            currentStartIndex: newStart,
            currentDurationDays: newDuration,
          } : null);
        }
      } else if (dragState.mode === 'resize-end') {
        const newDuration = Math.max(1, dragState.initialDurationDays + deltaDays);
        setDragState((prev) => prev ? {
          ...prev,
          currentDurationDays: newDuration,
        } : null);
      }
    };

    const handleMouseUp = async () => {
      if (!dragState) return;

      const currentDrag = { ...dragState };
      setDragState(null);

      // Calcular novas datas a partir de startDate e dos índices calculados
      const newStartDate = new Date(startDate.getTime() + currentDrag.currentStartIndex * 86400000);
      const newEndDate = new Date(
        startDate.getTime() +
        (currentDrag.currentStartIndex + currentDrag.currentDurationDays - 1) * 86400000
      );

      const targetTask = tasks.find((t) => t.id_tarefa === currentDrag.taskId);
      const isFinished = (targetTask?.status || '').toLowerCase().includes('final');
      const isInProgress = (targetTask?.status || '').toLowerCase().includes('desenvolvimento');

      const payload: any = {};
      if (isInProgress) {
        payload.data_inicio = newStartDate.toISOString();
        payload.data_previsao_fim = newEndDate.toISOString();
      } else if (isFinished) {
        payload.data_inicio = newStartDate.toISOString();
        payload.data_conclusao = newEndDate.toISOString();
      } else {
        // Não Iniciado
        payload.data_previsao_inicio = newStartDate.toISOString();
        payload.data_previsao_fim = newEndDate.toISOString();
      }

      try {
        await api.patch(`/tasks/${currentDrag.taskId}/timeline`, payload);
        showToast('success', 'Cronograma da tarefa atualizado com sucesso!');
        onRefresh(true);
      } catch (err: any) {
        console.error('Erro ao atualizar timeline:', err);
        showToast('error', err.response?.data?.message || 'Falha ao salvar as novas datas.');
        onRefresh(true);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, cellWidth, startDate, onRefresh, tasks]);

  const handleOpenDetails = (task: Task) => {
    setSelectedTask(task);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Toast Feedback */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-rose-600 text-white border-rose-500'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {/* Gantt Top Controls & Legend Bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
        {/* Navigation & Scale Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Zoom Switcher */}
          <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('days')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                viewMode === 'days'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dias
            </button>
            <button
              type="button"
              onClick={() => setViewMode('weeks')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                viewMode === 'weeks'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semanas
            </button>
            <button
              type="button"
              onClick={() => setViewMode('months')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                viewMode === 'months'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Meses
            </button>
          </div>

          {/* Botão Ir para Hoje */}
          <button
            onClick={scrollToToday}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-lg border border-slate-200 transition-colors"
            title="Rolar para a data atual"
          >
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Hoje</span>
          </button>

          {/* Navegação Temporal */}
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white">
            <button
              onClick={() => setCurrentOffsetDays((prev) => prev - 14)}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-l-lg transition-colors"
              title="Voltar 14 dias"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-semibold text-slate-400 px-2 select-none">
              Navegar
            </span>
            <button
              onClick={() => setCurrentOffsetDays((prev) => prev + 14)}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-r-lg transition-colors"
              title="Avançar 14 dias"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-medium text-slate-600 select-none">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-600"></span>
            <span>Não Iniciada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-amber-500"></span>
            <span>Em Andamento</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-600"></span>
            <span>Finalizada</span>
          </div>
        </div>
      </div>

      {/* Main Gantt Container */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        {/* Empty State */}
        {tasks.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <CalendarDays className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="text-base font-bold text-slate-700">Nenhuma tarefa encontrada</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tente ajustar os filtros acima ou cadastrar uma nova tarefa no quadro.
            </p>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden relative">
            {/* ========================================================
                LEFT: COLUNA DE TAREFAS / EQUIPES
            ========================================================= */}
            <div className="w-64 sm:w-80 shrink-0 border-r border-slate-200 bg-white z-20 shadow-xs flex flex-col">
              {/* Header da Coluna Lateral */}
              <div className="h-16 px-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Tarefas ({tasks.length})
                </span>
                <span className="text-[11px] font-semibold text-slate-400">
                  Responsável
                </span>
              </div>

              {/* Lista Vertical de Linhas */}
              <div className="divide-y divide-slate-100">
                {tasks.map((task) => {
                  const colors = getStatusBarColors(task.status);
                  return (
                    <div
                      key={task.id_tarefa}
                      className="h-14 px-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => handleOpenDetails(task)}
                      title={task.descricao} // Tooltip com nome completo
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden flex-1 pr-2">
                        {/* Status Dot */}
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors.dot}`} />

                        {/* Informações da Tarefa com Truncamento inteligente */}
                        <div className="overflow-hidden flex-1">
                          <p
                            className="text-xs font-bold text-slate-800 truncate block group-hover:text-blue-600 transition-colors"
                            title={task.descricao}
                          >
                            {task.descricao}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span className="font-semibold text-slate-500 uppercase">{task.equipe}</span>
                            <span>•</span>
                            <span className="capitalize">{task.prioridade}</span>
                          </div>
                        </div>
                      </div>

                      {/* Responsável & Botão Ação */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className="text-[11px] font-medium text-slate-600 max-w-[70px] truncate"
                          title={task.nome || 'Não atribuído'}
                        >
                          {task.nome?.split(' ')[0] || '—'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetails(task);
                          }}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-200/50 transition-colors opacity-0 group-hover:opacity-100"
                          title="Ver detalhes da tarefa"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ========================================================
                RIGHT: TIMELINE GRID COM DRAG & DROP E RESIZE
            ========================================================= */}
            <div
              ref={timelineScrollRef}
              className="flex-1 overflow-x-auto overflow-y-hidden select-none relative bg-slate-50/20"
              style={{ minHeight: `${tasks.length * 56 + 64}px` }}
            >
              <div
                style={{ width: `${totalDays * cellWidth}px` }}
                className="relative h-full flex flex-col"
              >
                {/* Cabeçalho da Linha do Tempo */}
                <div className="h-16 border-b border-slate-200 sticky top-0 z-10 bg-white">
                  {/* Linha 1: Meses */}
                  <div className="h-8 flex border-b border-slate-100">
                    {monthGroups.map((group, idx) => (
                      <div
                        key={idx}
                        style={{ width: `${group.daysCount * cellWidth}px` }}
                        className="px-3 flex items-center text-xs font-bold text-slate-700 uppercase tracking-wider border-r border-slate-100 truncate"
                      >
                        {group.label}
                      </div>
                    ))}
                  </div>

                  {/* Linha 2: Dias */}
                  <div className="h-8 flex">
                    {daysArray.map((day, idx) => {
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      const isToday = todayIndex === idx;
                      const dayNumber = day.getDate();
                      const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
                      const weekDayLetter = weekDays[day.getDay()];

                      return (
                        <div
                          key={idx}
                          style={{ width: `${cellWidth}px` }}
                          title={formatDate(day.toISOString())}
                          className={`flex flex-col items-center justify-center border-r border-slate-100 text-[10px] shrink-0 ${
                            isToday
                              ? 'bg-blue-50 text-blue-700 font-black'
                              : isWeekend
                              ? 'bg-slate-100/60 text-slate-400'
                              : 'text-slate-600'
                          }`}
                        >
                          {viewMode !== 'months' && (
                            <span className="leading-tight">{dayNumber}</span>
                          )}
                          {viewMode === 'days' && (
                            <span className="text-[8px] font-semibold uppercase opacity-75">
                              {weekDayLetter}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Marcador Vertical da Data Atual (Hoje) */}
                {todayIndex !== null && (
                  <div
                    style={{
                      left: `${todayIndex * cellWidth + cellWidth / 2}px`,
                      height: '100%',
                    }}
                    className="absolute top-16 w-0.5 bg-blue-500/70 z-10 pointer-events-none"
                  />
                )}

                {/* Linhas de Fundo e Barras do Gantt */}
                <div className="flex-1 divide-y divide-slate-100 relative">
                  {tasks.map((task) => {
                    const pos = getTaskPosition(task);
                    const colors = getStatusBarColors(task.status);
                    const isDraggingThis = dragState?.taskId === task.id_tarefa;

                    return (
                      <div
                        key={task.id_tarefa}
                        className="h-14 relative flex items-center"
                      >
                        {/* Colunas verticais de fundo para o grid */}
                        <div className="absolute inset-0 flex pointer-events-none">
                          {daysArray.map((day, idx) => {
                            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                            return (
                              <div
                                key={idx}
                                style={{ width: `${cellWidth}px` }}
                                className={`h-full border-r border-slate-100/80 shrink-0 ${
                                  isWeekend ? 'bg-slate-50/60' : ''
                                }`}
                              />
                            );
                          })}
                        </div>

                        {/* Barra do Gantt */}
                        <div
                          style={{
                            left: `${pos.left}px`,
                            width: `${pos.width}px`,
                          }}
                          className={`absolute h-8 rounded-lg ${colors.bg} ${colors.text} shadow-sm flex items-center px-2 z-10 cursor-grab active:cursor-grabbing transition-all select-none group/bar ${
                            isDraggingThis ? 'ring-2 ring-blue-400 ring-offset-2 scale-102 z-30 shadow-md' : ''
                          }`}
                          onMouseDown={(e) => handleMouseDown(e, task, 'move')}
                          title={`${task.descricao}\n${pos.hasRealStart ? 'Início Real' : 'Previsão de Início'}: ${formatDate(pos.dStart.toISOString())}\n${pos.hasRealEnd ? 'Conclusão Real' : 'Previsão de Término'}: ${formatDate(pos.dEnd.toISOString())} (${pos.durationDays} dias)`}
                        >
                          {/* Alça Esquerda (Resize Start) */}
                          <div
                            className="absolute left-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-black/20 rounded-l-lg transition-colors z-20 flex items-center justify-center opacity-0 group-hover/bar:opacity-100"
                            onMouseDown={(e) => handleMouseDown(e, task, 'resize-start')}
                            title="Arrastar para alterar data de início"
                          >
                            <div className="w-1 h-3 bg-white/70 rounded-full" />
                          </div>

                          {/* Conteúdo Central da Barra: Título Truncado com Tooltip Unificado */}
                          <div className="flex-1 flex items-center gap-1.5 overflow-hidden px-1 pointer-events-none">
                            <span className="text-xs font-semibold truncate block drop-shadow-xs">
                              {task.descricao}
                            </span>
                            <span className="text-[10px] opacity-80 shrink-0 hidden sm:inline">
                              ({pos.durationDays}d)
                            </span>
                          </div>

                          {/* Alça Direita (Resize End) */}
                          <div
                            className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-black/20 rounded-r-lg transition-colors z-20 flex items-center justify-center opacity-0 group-hover/bar:opacity-100"
                            onMouseDown={(e) => handleMouseDown(e, task, 'resize-end')}
                            title="Arrastar para alterar previsão de término"
                          >
                            <div className="w-1 h-3 bg-white/70 rounded-full" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalhes com Feed/Comentários/Anexos */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedTask(null);
          }}
          onTaskUpdated={() => onRefresh(true)}
        />
      )}
    </div>
  );
};
