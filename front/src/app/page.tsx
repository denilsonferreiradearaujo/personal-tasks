'use client';

import React, {
  useState,
  useEffect,
  useCallback,
} from 'react';

import Link from 'next/link';
import { Navbar } from '../components/layout/Navbar';
import { Sidebar } from '../components/layout/Sidebar';
import { TaskBoard } from '../components/tasks/TaskBoard';
import { TaskModal } from '../components/tasks/TaskModal';
import { Task, TaskStatus } from '../types';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Lock,
} from 'lucide-react';

export default function Home() {
  /**
   * Autenticação
   */
  const {
    isAuthenticated,
    loading: authLoading,
  } = useAuth();

  /**
   * Estados
   */
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [defaultTaskStatus, setDefaultTaskStatus] = useState('Não Iniciado');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  /**
   * Toast
   */
  const showToast = (
    type: 'success' | 'error',
    text: string
  ) => {
    setToastMessage({
      type,
      text,
    });

    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  /**
   * Buscar tarefas
   */
  const fetchTasks = useCallback(
    async (silent: boolean = false) => {
      if (!isAuthenticated) {
        setTasks([]);
        setIsLoading(false);
        return;
      }

      try {
        if (!silent) {
          setIsLoading(true);
        }

        const res = await api.get('/tasks');
        const data = Array.isArray(res.data) ? res.data : res.data.tarefas || [];
        setTasks(data);
      } catch (err: any) {
        console.error('Erro ao buscar tarefas:', err);

        try {
          const resLegacy = await api.get('/listarTarefas');
          setTasks(resLegacy.data.tarefas || []);
        } catch (fallbackErr) {
          console.error('Erro na rota legada:', fallbackErr);
          setTasks([]);
          showToast(
            'error',
            'Falha ao conectar com o backend. Verifique se o servidor está ativo.'
          );
        }
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [isAuthenticated]
  );

  /**
   * Verifica autenticação antes de buscar tarefas
   */
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (isAuthenticated) {
      fetchTasks();
    } else {
      setTasks([]);
      setIsLoading(false);
    }
  }, [
    authLoading,
    isAuthenticated,
    fetchTasks,
  ]);

  /**
   * Smart Polling Silencioso em Tempo Real
   */
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;

    let intervalId: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (!intervalId) {
        intervalId = setInterval(() => {
          if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
            fetchTasks(true);
          }
        }, 4000);
      }
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchTasks(true);
        startPolling();
      } else {
        stopPolling();
      }
    };

    startPolling();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleVisibilityChange);
    }

    return () => {
      stopPolling();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleVisibilityChange);
      }
    };
  }, [isAuthenticated, authLoading, fetchTasks]);

  /**
   * Atualizar status da tarefa
   */
  const handleUpdateStatus = async (
    id: number,
    newStatus: TaskStatus
  ) => {
    if (!isAuthenticated) {
      showToast(
        'error',
        'Faça login para alterar tarefas.'
      );
      return;
    }

    try {
      await api.patch(
        `/tasks/${id}/status`,
        {
          status: newStatus,
        }
      );

      showToast(
        'success',
        `Status da tarefa atualizado para "${newStatus}".`
      );

      await fetchTasks();
    } catch (err: any) {
      console.error(
        'Erro ao atualizar status:',
        err
      );

      try {
        await api.put(
          `/atualizarStatus/${id}`,
          {
            status: newStatus,
          }
        );

        showToast(
          'success',
          'Status atualizado com sucesso.'
        );

        await fetchTasks();
      } catch (legacyErr) {
        console.error(
          'Erro na rota legada:',
          legacyErr
        );

        showToast(
          'error',
          'Erro ao atualizar o status da tarefa.'
        );
      }
    }
  };

  /**
   * Excluir tarefa
   */
  const handleDeleteTask = async (
    id: number
  ) => {
    if (!isAuthenticated) {
      showToast(
        'error',
        'Faça login para excluir tarefas.'
      );
      return;
    }

    try {
      await api.delete(
        `/tasks/${id}`
      );

      showToast(
        'success',
        'Tarefa excluída com sucesso.'
      );

      await fetchTasks();
    } catch (err: any) {
      console.error(
        'Erro ao excluir tarefa:',
        err
      );

      try {
        await api.delete(
          `/deletarTarefa/${id}`
        );

        showToast(
          'success',
          'Tarefa excluída com sucesso.'
        );

        await fetchTasks();
      } catch (legacyErr) {
        console.error(
          'Erro na rota legada:',
          legacyErr
        );

        showToast(
          'error',
          'Erro ao excluir a tarefa.'
        );
      }
    }
  };

  /**
   * Abrir modal de nova tarefa
   */
  const handleOpenNewTask = (
    status: string = 'Não Iniciado'
  ) => {
    if (!isAuthenticated) {
      showToast(
        'error',
        'Faça login para criar tarefas.'
      );
      return;
    }

    setDefaultTaskStatus(status);
    setIsTaskModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* =====================================================
          TOAST
      ====================================================== */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 rounded-xl bg-slate-900 text-white px-4 py-3 shadow-xl animate-in slide-in-from-bottom-5 duration-200">
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-400" />
          )}
          <span className="text-sm font-medium">
            {toastMessage.text}
          </span>
        </div>
      )}

      {/* =====================================================
          SIDEBAR (LATERAL)
      ====================================================== */}
      {isAuthenticated && (
        <Sidebar
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* =====================================================
          CONTEÚDO PRINCIPAL
      ====================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          onOpenNewTask={() =>
            handleOpenNewTask(
              'Não Iniciado'
            )
          }
          onToggleMobile={() => setIsMobileMenuOpen(true)}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header da Página */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="text-left">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Painel de Gestão de Projetos</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Quadro de Tarefas (Kanban)
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Acompanhe o fluxo de trabalho das equipes em tempo real com controle de prioridades.
              </p>
            </div>
          </div>

          {/* Conteúdo do Quadro */}
          {authLoading || isLoading ? (
            <div className="flex flex-col items-center justify-center h-96">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
              <p className="text-sm font-medium text-slate-500 mt-4">
                {authLoading
                  ? 'Verificando autenticação...'
                  : 'Carregando quadro de tarefas...'}
              </p>
            </div>
          ) : !isAuthenticated ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="w-full max-w-md text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <Lock className="h-8 w-8" />
                </div>
                <h2 className="mt-5 text-xl font-bold text-slate-900">
                  Faça login para visualizar as tarefas
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Você precisa estar autenticado para acessar e gerenciar suas tarefas.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center mt-6 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  Fazer login
                </Link>
              </div>
            </div>
          ) : (
            <TaskBoard
              tasks={tasks}
              onRefresh={fetchTasks}
              onUpdateStatus={handleUpdateStatus}
              onDeleteTask={handleDeleteTask}
              onOpenNewTask={handleOpenNewTask}
            />
          )}
        </main>
      </div>

      {/* =====================================================
          MODAL - NOVA TAREFA
      ====================================================== */}
      {isAuthenticated && (
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          onSuccess={() => {
            showToast(
              'success',
              'Nova tarefa criada com sucesso!'
            );
            fetchTasks();
          }}
          defaultStatus={defaultTaskStatus}
        />
      )}
    </div>
  );
}