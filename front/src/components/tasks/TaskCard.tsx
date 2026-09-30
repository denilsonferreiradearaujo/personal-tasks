'use client';

import React from 'react';
import {
  Pencil,
  Trash2,
  Users,
  Calendar,
  Lock,
  Globe,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';
import { Task, TaskStatus } from '../../types';
import { Badge } from '../ui/Badge';
import { formatDate, getInitials } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, newStatus: TaskStatus) => void;
  onViewDetails?: (task: Task) => void;
  isUnread?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  onViewDetails,
  isUnread = false,
}) => {
  const { user } = useAuth();

  const isMyTask = task.isOwner !== undefined 
    ? task.isOwner 
    : (user ? task.id_usuario === user.id_usuario : true);
  
  const isSharedWithMe = task.isSharedWithMe !== undefined
    ? task.isSharedWithMe
    : (user ? task.id_usuario !== user.id_usuario : false);

  const canDelete = isMyTask || (user?.role === 'ADMIN' || user?.role === 'ROOT');

  const getPriorityBadge = (prioridade: string) => {
    const p = (prioridade || '').toLowerCase();
    switch (p) {
      case 'alta':
        return <Badge variant="danger" size="sm">Alta Prioridade</Badge>;
      case 'média':
      case 'media':
        return <Badge variant="warning" size="sm">Média</Badge>;
      case 'baixa':
        return <Badge variant="success" size="sm">Baixa</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{prioridade}</Badge>;
    }
  };

  return (
    <div className={`group relative rounded-xl border p-4 shadow-sm hover:shadow-md transition-all duration-200 text-left flex flex-col justify-between ${
      isSharedWithMe 
        ? 'border-indigo-200/90 bg-gradient-to-b from-indigo-50/30 to-white hover:border-indigo-300' 
        : 'border-slate-200/80 bg-white hover:border-blue-200'
    }`}>
      {/* Header: Priority, Privacy & Squad */}
      <div>
        <div className="flex items-center justify-between gap-1 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {getPriorityBadge(task.prioridade)}
            {isSharedWithMe ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 shadow-xs" title={`Compartilhada com você por ${task.nome || 'outro usuário'}`}>
                <Users className="h-3 w-3 text-indigo-600" />
                Compartilhada com você
              </span>
            ) : task.isCompartilhada ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/80" title="Compartilhada por você (outros têm acesso)">
                <Globe className="h-3 w-3 text-sky-600" />
                Compartilhada por você
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80" title="Privada (apenas visível por você)">
                <Lock className="h-3 w-3 text-amber-600" />
                Privada (sua)
              </span>
            )}
          </div>

          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60">
            <Users className="h-3 w-3 text-slate-400" />
            {task.equipe}
          </span>
        </div>

        {/* Description: Clicável para abrir o Feed/Blog da Tarefa */}
        <h4
          onClick={() => onViewDetails && onViewDetails(task)}
          className="text-sm font-semibold text-slate-800 leading-snug mb-3.5 group-hover:text-blue-600 cursor-pointer transition-colors flex items-start justify-between"
          title="Clique para abrir detalhes e chat"
        >
          <span>{task.descricao}</span>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 shrink-0 ml-1 mt-0.5 transition-colors" />
        </h4>
      </div>

      {/* Assignee & Comments Feed Badge */}
      <div>
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 mb-3">
          <div className="flex items-center space-x-2">
            <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center">
              {getInitials(task.nome || 'U')}
            </div>
            <span className="font-medium text-slate-700 truncate max-w-[110px]">
              {task.nome || 'Não atribuído'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onViewDetails && onViewDetails(task)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 transition-colors"
            title="Abrir Feed/Chat da Tarefa"
          >
            <MessageSquare className="h-3 w-3 text-slate-400" />
            <span className={isUnread ? 'text-[12px] font-black text-slate-900' : 'text-[11px] font-medium text-slate-600'}>
              {task.totalComentarios || 0}
            </span>
          </button>
        </div>

        {/* Card Controls: Status Selector & Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-dashed border-slate-100 gap-2">
          <div className="relative flex-1">
            <select
              value={task.status}
              onChange={(e) => onStatusChange(task.id_tarefa, e.target.value)}
              className="w-full text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition-colors"
            >
              <option value="Não Iniciado">Não Iniciado</option>
              <option value="Em Desenvolvimento">Em Desenvolvimento</option>
              <option value="Finalizado">Finalizado</option>
            </select>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => onEdit(task)}
              title="Editar Tarefa"
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {canDelete && (
              <button
                onClick={() => onDelete(task.id_tarefa)}
                title="Excluir Tarefa"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
