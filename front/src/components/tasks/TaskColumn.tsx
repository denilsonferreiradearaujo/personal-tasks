'use client';

import React from 'react';
import { Task, TaskStatus } from '../../types';
import { TaskCard } from './TaskCard';
import { PlusCircle } from 'lucide-react';

interface TaskColumnProps {
  status: TaskStatus;
  title: string;
  tasks: Task[];
  accentColor: string;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: number) => void;
  onStatusChange: (id: number, newStatus: TaskStatus) => void;
  onAddNewTask?: () => void;
  onViewDetails?: (task: Task) => void;
}

export const TaskColumn: React.FC<TaskColumnProps> = ({
  status,
  title,
  tasks,
  accentColor,
  onEditTask,
  onDeleteTask,
  onStatusChange,
  onAddNewTask,
  onViewDetails,
}) => {
  return (
    <div className="flex flex-col rounded-2xl bg-slate-100/70 border border-slate-200/80 p-4 h-full min-h-[500px]">
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-200/80">
        <div className="flex items-center space-x-2.5">
          <span className={`h-3 w-3 rounded-full ${accentColor}`} />
          <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
          <span className="flex items-center justify-center h-5 px-2 rounded-full bg-slate-200 text-slate-700 text-xs font-bold">
            {tasks.length}
          </span>
        </div>

        {onAddNewTask && (
          <button
            onClick={onAddNewTask}
            className="text-slate-400 hover:text-blue-600 transition-colors"
            title="Adicionar tarefa nesta coluna"
          >
            <PlusCircle className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Cards List */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-slate-200 rounded-xl p-4 text-center">
            <p className="text-xs font-medium text-slate-400">Nenhuma tarefa nesta etapa</p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id_tarefa}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onStatusChange={onStatusChange}
              onViewDetails={onViewDetails}
            />
          ))
        )}
      </div>
    </div>
  );
};
