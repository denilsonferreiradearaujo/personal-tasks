'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Task, User } from '../../types';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  onSuccess: () => void;
  defaultStatus?: string;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  taskToEdit,
  onSuccess,
  defaultStatus = 'Não Iniciado',
}) => {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'ROOT';

  const [users, setUsers] = useState<User[]>([]);
  const [descricao, setDescricao] = useState('');
  const [equipe, setEquipe] = useState('');
  const [idUsuario, setIdUsuario] = useState<number | string>(currentUser?.id_usuario || '');
  const [prioridade, setPrioridade] = useState('baixa');
  const [status, setStatus] = useState('Não Iniciado');
  const [dataPrevisaoInicio, setDataPrevisaoInicio] = useState('');
  const [dataPrevisaoFim, setDataPrevisaoFim] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDateForInput = (d?: string) => {
    if (!d) return '';
    try {
      return new Date(d).toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  // Carregar lista de usuários para seleção apenas para Admin/Root
  useEffect(() => {
    if (isOpen && isAdmin) {
      api
        .get('/usuarios')
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : res.data.users || [];
          setUsers(list);
          if (!taskToEdit && !idUsuario && currentUser) {
            setIdUsuario(currentUser.id_usuario);
          }
        })
        .catch((err) => {
          console.error('Erro ao carregar usuários:', err);
        });
    } else if (isOpen && currentUser) {
      setIdUsuario(currentUser.id_usuario);
    }
  }, [isOpen, isAdmin, currentUser]);

  // Preencher dados ao editar ou abrir novo
  useEffect(() => {
    if (taskToEdit) {
      setDescricao(taskToEdit.descricao);
      setEquipe(taskToEdit.equipe);
      setIdUsuario(taskToEdit.id_usuario);
      setPrioridade((taskToEdit.prioridade || 'baixa').toLowerCase());
      setStatus(taskToEdit.status || 'Não Iniciado');
      setDataPrevisaoInicio(formatDateForInput(taskToEdit.data_previsao_inicio || taskToEdit.data_cadastro));
      setDataPrevisaoFim(formatDateForInput(taskToEdit.data_previsao_fim));
    } else {
      setDescricao('');
      setEquipe('');
      setPrioridade('baixa');
      setStatus('Não Iniciado');
      setIdUsuario(currentUser?.id_usuario || '');
      const today = new Date().toISOString().split('T')[0];
      const next3 = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];
      setDataPrevisaoInicio(today);
      setDataPrevisaoFim(next3);
    }
    setError(null);
  }, [taskToEdit, isOpen, currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) {
      setError('A descrição é obrigatória.');
      return;
    }
    if (!equipe.trim()) {
      setError('O nome da equipe é obrigatório.');
      return;
    }

    const resolvedUserId = Number(idUsuario || currentUser?.id_usuario);
    if (!resolvedUserId) {
      setError('Sessão expirada ou usuário não identificado. Faça login novamente.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const payload: any = {
        descricao: descricao.trim(),
        equipe: equipe.trim(),
        id_usuario: resolvedUserId,
        prioridade,
        status: taskToEdit ? status : 'Não Iniciado',
        data_previsao_inicio: dataPrevisaoInicio ? new Date(dataPrevisaoInicio).toISOString() : undefined,
        data_previsao_fim: dataPrevisaoFim ? new Date(dataPrevisaoFim).toISOString() : undefined,
      };

      if (taskToEdit) {
        await api.put(`/tasks/${taskToEdit.id_tarefa}`, payload);
      } else {
        await api.post('/tasks', payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Erro ao salvar a tarefa.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={taskToEdit ? 'Editar Tarefa' : 'Nova Tarefa'}
      description={
        taskToEdit
          ? 'Atualize os dados da tarefa.'
          : 'Preencha as informações para registrar sua tarefa no Kanban.'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        {/* Descrição */}
        <div className="text-left space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Descrição da Tarefa *
          </label>
          <textarea
            required
            rows={3}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex: Desenvolver fluxo de autenticação com JWT e Bcrypt"
            className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Equipe */}
        <Input
          label="Equipe / Squad *"
          required
          placeholder="Ex: Backend, Frontend, QA, DevOps"
          value={equipe}
          onChange={(e) => setEquipe(e.target.value)}
        />

        {/* Usuário Responsável - Apenas exibido se for Admin ou Root */}
        {isAdmin && (
          <div className="text-left space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Usuário Responsável (Atribuir)
            </label>
            <select
              value={idUsuario}
              onChange={(e) => setIdUsuario(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {users.length === 0 ? (
                <option value={currentUser?.id_usuario || ''}>
                  {currentUser?.nome} (Você)
                </option>
              ) : (
                users.map((u) => (
                  <option key={u.id_usuario} value={u.id_usuario}>
                    {u.nome} ({u.email}) {u.id_usuario === currentUser?.id_usuario ? '- (Você)' : ''}
                  </option>
                ))
              )}
            </select>
          </div>
        )}

        {/* Prioridade e Status (Status apenas na edição) */}
        {taskToEdit ? (
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Prioridade"
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value)}
            >
              <option value="baixa">Baixa</option>
              <option value="média">Média</option>
              <option value="alta">Alta</option>
            </Select>

            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="Não Iniciado">Não Iniciado</option>
              <option value="Em Desenvolvimento">Em Desenvolvimento</option>
              <option value="Finalizado">Finalizado</option>
            </Select>
          </div>
        ) : (
          <div>
            <Select
              label="Prioridade"
              value={prioridade}
              onChange={(e) => setPrioridade(e.target.value)}
            >
              <option value="baixa">Baixa</option>
              <option value="média">Média</option>
              <option value="alta">Alta</option>
            </Select>
          </div>
        )}

        {/* Datas do Cronograma (Planejamento) */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="date"
            label="Previsão de Início *"
            required
            value={dataPrevisaoInicio}
            onChange={(e) => setDataPrevisaoInicio(e.target.value)}
          />
          <Input
            type="date"
            label="Previsão de Término *"
            required
            value={dataPrevisaoFim}
            onChange={(e) => setDataPrevisaoFim(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {taskToEdit ? 'Atualizar Tarefa' : 'Criar Tarefa'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
