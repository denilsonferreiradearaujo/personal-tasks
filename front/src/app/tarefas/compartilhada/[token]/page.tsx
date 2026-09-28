'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '../../../../components/layout/Navbar';
import { TaskDetailModal } from '../../../../components/tasks/TaskDetailModal';
import { Task } from '../../../../types';
import api from '../../../../services/api';
import { Globe, ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';

export default function TarefaCompartilhadaPage() {
  const params = useParams();
  const token = params?.token as string;

  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (token) {
      loadSharedTask(token);
    }
  }, [token]);

  const loadSharedTask = async (shareToken: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await api.get(`/tasks/shared/${shareToken}`);
      setTask(res.data);
      setIsModalOpen(true);
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 'Link de compartilhamento inválido ou expirado.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 flex flex-col items-center justify-center">
        {isLoading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
            <p className="text-sm font-medium text-slate-500 mt-4">Carregando tarefa compartilhada...</p>
          </div>
        ) : error ? (
          <div className="bg-white p-8 rounded-2xl border border-rose-200 text-center max-w-md shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Acesso Indisponível</h2>
            <p className="text-sm text-slate-600 mt-2">{error}</p>
            <Link href="/" className="inline-flex items-center gap-2 mt-6">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Ir para o Quadro Principal
              </Button>
            </Link>
          </div>
        ) : task ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-lg shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-4">
              <Globe className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Tarefa Compartilhada</h2>
            <p className="text-sm text-slate-600 mb-6">{task.descricao}</p>
            <Button onClick={() => setIsModalOpen(true)}>
              Abrir Feed de Interações da Tarefa
            </Button>
          </div>
        ) : null}
      </main>

      {task && (
        <TaskDetailModal
          task={task}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onTaskUpdated={() => token && loadSharedTask(token)}
        />
      )}
    </div>
  );
}
