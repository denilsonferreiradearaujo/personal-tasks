'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  Send,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Trash2,
  Edit2,
  Lock,
  Globe,
  Users,
  Calendar,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Task, TaskComment } from '../../types';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ConfirmModal } from '../ui/ConfirmModal';
import { formatDate, getInitials } from '../../lib/utils';

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated?: () => void;
  onCommentsRead?: (taskId: number, total: number) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onTaskUpdated,
  onCommentsRead,
}) => {
  const { user: currentUser } = useAuth();

  const [currentTask, setCurrentTask] = useState<Task | null>(task);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  // Estados de novo comentário
  const [newCommentText, setNewCommentText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados de edição de comentário
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  // Estados de compartilhamento
  const [isSharingOpen, setIsSharingOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

  // Preview de imagem ampliada
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Marcar comentários como lidos no localStorage e notificar parent
  const markAsRead = (taskId: number, total: number) => {
    if (currentUser) {
      const key = `personal_tasks_read_comments_${currentUser.id_usuario}`;
      try {
        const stored = localStorage.getItem(key);
        const map = stored ? JSON.parse(stored) : {};
        map[taskId] = total;
        localStorage.setItem(key, JSON.stringify(map));
      } catch (e) {
        console.error('Erro ao salvar leitura:', e);
      }
    }
    if (onCommentsRead) {
      onCommentsRead(taskId, total);
    }
  };

  useEffect(() => {
    setCurrentTask(task);
    if (task && isOpen) {
      loadTaskDetails(task.id_tarefa);
    }
  }, [task, isOpen]);

  const loadTaskDetails = async (taskId: number, silent: boolean = false) => {
    try {
      if (!silent) {
        setIsLoadingComments(true);
      }
      const res = await api.get(`/tasks/${taskId}`);
      setCurrentTask(res.data);
      const commentsList = res.data.comentarios || [];
      setComments(commentsList);
      markAsRead(taskId, commentsList.length);
    } catch (err) {
      console.error('Erro ao carregar detalhes da tarefa:', err);
    } finally {
      if (!silent) {
        setIsLoadingComments(false);
      }
    }
  };

  // Capturar e anexar imagem direto da área de transferência (Printscreen / Recorte / Copy & Paste)
  const handlePaste = (e: React.ClipboardEvent | ClipboardEvent) => {
    const clipboardData = (e as any).clipboardData;
    if (!clipboardData) return;

    const items = clipboardData.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const ext = file.type.includes('png') ? 'png' : file.type.includes('jpeg') ? 'jpg' : 'png';
            const renamedFile = new File([file], `printscreen-${timestamp}.${ext}`, {
              type: file.type || 'image/png',
            });
            setSelectedFile(renamedFile);
            e.preventDefault();
            break;
          }
        }
      }
    }
  };

  // Listener global de paste no modal para capturar qualquer Ctrl+V de imagem
  useEffect(() => {
    if (!isOpen) return;

    const onGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          handlePaste(e);
          break;
        }
      }
    };

    window.addEventListener('paste', onGlobalPaste);
    return () => {
      window.removeEventListener('paste', onGlobalPaste);
    };
  }, [isOpen]);

  // Polling silencioso em tempo real dos comentários e chat enquanto o modal estiver aberto
  useEffect(() => {
    if (!isOpen || !task) return;

    const intervalId = setInterval(() => {
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible' &&
        !isSubmitting
      ) {
        loadTaskDetails(task.id_tarefa, true);
      }
    }, 3000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isOpen, task?.id_tarefa, isSubmitting]);

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Estados de confirmação padronizada (ConfirmModal)
  const [commentToDeleteId, setCommentToDeleteId] = useState<number | null>(null);
  const [isDeletingComment, setIsDeletingComment] = useState(false);
  const [isUnshareModalOpen, setIsUnshareModalOpen] = useState(false);

  // Toast interno para feedbacks e mensagens informativas
  const [modalToast, setModalToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const showModalToast = (type: 'success' | 'error', text: string) => {
    setModalToast({ type, text });
    setTimeout(() => setModalToast(null), 3500);
  };

  // Enviar comentário/print/arquivo
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTask) return;
    if (!newCommentText.trim() && !selectedFile) return;

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('conteudo', newCommentText || (selectedFile ? `Anexou: ${selectedFile.name}` : ''));

      if (selectedFile) {
        formData.append('file', selectedFile);
        formData.append('tipo', selectedFile.type.startsWith('image/') ? 'IMAGE' : 'FILE');
      } else {
        formData.append('tipo', 'TEXT');
      }

      await api.post(`/tasks/${currentTask.id_tarefa}/comments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setNewCommentText('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      await loadTaskDetails(currentTask.id_tarefa);
      if (onTaskUpdated) onTaskUpdated();
      setTimeout(scrollToBottom, 200);
    } catch (err: any) {
      showModalToast('error', err.response?.data?.message || 'Erro ao enviar comentário.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Salvar edição de comentário
  const handleSaveEditComment = async (commentId: number) => {
    if (!editingText.trim()) return;

    try {
      await api.put(`/tasks/comments/${commentId}`, { conteudo: editingText });
      setEditingCommentId(null);
      setEditingText('');
      if (currentTask) await loadTaskDetails(currentTask.id_tarefa);
      showModalToast('success', 'Mensagem atualizada com sucesso.');
    } catch (err: any) {
      showModalToast('error', err.response?.data?.message || 'Erro ao salvar alteração.');
    }
  };

  // Excluir comentário
  const handleDeleteComment = (commentId: number) => {
    setCommentToDeleteId(commentId);
  };

  const handleConfirmDeleteComment = async () => {
    if (!commentToDeleteId) return;
    try {
      setIsDeletingComment(true);
      await api.delete(`/tasks/comments/${commentToDeleteId}`);
      setCommentToDeleteId(null);
      if (currentTask) {
        await loadTaskDetails(currentTask.id_tarefa);
        if (onTaskUpdated) onTaskUpdated();
      }
      showModalToast('success', 'Mensagem excluída com sucesso.');
    } catch (err: any) {
      showModalToast('error', err.response?.data?.message || 'Erro ao excluir mensagem.');
    } finally {
      setIsDeletingComment(false);
    }
  };

  // Compartilhar tarefa
  const handleShareTask = async () => {
    if (!currentTask) return;

    try {
      setShareLoading(true);
      const payload: any = {};
      if (shareEmail.trim()) {
        payload.emails = [shareEmail.trim()];
      }

      const res = await api.post(`/tasks/${currentTask.id_tarefa}/share`, payload);
      setShareEmail('');
      await loadTaskDetails(currentTask.id_tarefa);
      if (onTaskUpdated) onTaskUpdated();

      // Copiar link para o clipboard
      if (res.data?.shareUrl) {
        navigator.clipboard.writeText(res.data.shareUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 3000);
        showModalToast('success', 'Link copiado para a área de transferência!');
      }
    } catch (err: any) {
      showModalToast('error', err.response?.data?.message || 'Erro ao compartilhar tarefa.');
    } finally {
      setShareLoading(false);
    }
  };

  // Revogar compartilhamento (exclusivo para o responsável da tarefa)
  const isOwner = Boolean(
    currentTask?.isOwner ||
    (currentUser?.id_usuario && Number(currentTask?.id_usuario) === Number(currentUser.id_usuario))
  );

  const handleUnshareTask = () => {
    if (!currentTask || !isOwner) return;
    setIsUnshareModalOpen(true);
  };

  const handleConfirmUnshare = async () => {
    if (!currentTask || !isOwner) {
      showModalToast('error', 'Apenas o responsável pela tarefa pode retirar o compartilhamento.');
      return;
    }
    try {
      setShareLoading(true);
      await api.delete(`/tasks/${currentTask.id_tarefa}/share`);
      setIsUnshareModalOpen(false);
      await loadTaskDetails(currentTask.id_tarefa);
      if (onTaskUpdated) onTaskUpdated();
      showModalToast('success', 'Compartilhamento revogado. A tarefa agora é privada.');
    } catch (err: any) {
      showModalToast('error', err.response?.data?.message || 'Erro ao revogar compartilhamento.');
    } finally {
      setShareLoading(false);
    }
  };

  const copyShareLink = () => {
    if (!currentTask?.shareToken) return;
    const shareUrl = `${window.location.origin}/tarefas/compartilhada/${currentTask.shareToken}`;
    navigator.clipboard.writeText(shareUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  if (!isOpen || !currentTask) return null;

  const isPrivileged = currentUser?.role === 'ADMIN' || currentUser?.role === 'ROOT';
  const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp">
        {/* =====================================================
            CABEÇALHO DO MODAL
        ====================================================== */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div className="space-y-2 flex-1 pr-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="neutral" className="font-semibold text-xs text-slate-700 bg-white">
                {currentTask.equipe}
              </Badge>
              <Badge variant={currentTask.prioridade as any}>
                Prioridade {currentTask.prioridade}
              </Badge>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700">
                {currentTask.status}
              </span>
              {currentTask.isCompartilhada ? (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-sky-100 text-sky-800">
                  <Globe className="w-3 h-3" /> Compartilhada
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800">
                  <Lock className="w-3 h-3" /> Privada (Apenas Você)
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
              {currentTask.descricao}
            </h2>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                Criada por: <strong>{currentTask.nome || 'Desconhecido'}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Criada em: {formatDate(currentTask.data_cadastro)}
              </span>
              {currentTask.data_inicio && (
                <span className="flex items-center gap-1 text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Início: {formatDate(currentTask.data_inicio)}
                </span>
              )}
              {currentTask.data_previsao_fim && (
                <span className="flex items-center gap-1 text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                  Previsão: {formatDate(currentTask.data_previsao_fim)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Botão Compartilhar */}
            {(isOwner || isPrivileged) && (
              <Button
                variant={currentTask.isCompartilhada ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => setIsSharingOpen(!isSharingOpen)}
                className="flex items-center gap-1.5"
              >
                <Share2 className="w-4 h-4" />
                <span>{currentTask.isCompartilhada ? 'Opções de Link' : 'Compartilhar'}</span>
              </Button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =====================================================
            PAINEL DE COMPARTILHAMENTO
        ====================================================== */}
        {isSharingOpen && (
          <div className="p-4 bg-sky-50/70 border-b border-sky-100 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-sky-950 flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-sky-600" />
                  Compartilhamento da Tarefa
                </h4>
                <p className="text-xs text-sky-800 mt-0.5">
                  Quem tiver este link poderá visualizar a evolução e participar do feed de conversas.
                </p>
              </div>

              {currentTask.isCompartilhada && isOwner && (
                <button
                  onClick={handleUnshareTask}
                  disabled={shareLoading}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold underline self-start sm:self-auto"
                >
                  Tornar Privada Novamente
                </button>
              )}
            </div>

            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Convidar por e-mail (ex: colega@senai.com)..."
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-white rounded-lg border border-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
              <Button
                size="sm"
                onClick={handleShareTask}
                isLoading={shareLoading}
                className="shrink-0"
              >
                {currentTask.isCompartilhada ? 'Adicionar E-mail' : 'Ativar & Gerar Link'}
              </Button>

              {currentTask.isCompartilhada && currentTask.shareToken && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyShareLink}
                  className="shrink-0 flex items-center gap-1.5 bg-white"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{isCopied ? 'Link Copiado!' : 'Copiar Link'}</span>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Feedback Toast Interno */}
        {modalToast && (
          <div
            className={`mx-6 mt-3 p-3 rounded-xl border flex items-center gap-2.5 text-xs font-semibold animate-in fade-in duration-150 ${
              modalToast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {modalToast.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{modalToast.text}</span>
          </div>
        )}

        {/* =====================================================
            CORPO DO MODAL - FEED ESTILO BLOG / CHAT
        ====================================================== */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span>Feed de Atualizações e Conversas</span>
              <span className="text-xs py-0.5 px-2 rounded-full bg-blue-100 text-blue-700 font-bold">
                {comments.length}
              </span>
            </h3>
            <span className="text-xs text-slate-400">
              Postagens, prints e arquivos em tempo real
            </span>
          </div>

          {isLoadingComments ? (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
              <p className="text-xs text-slate-400 mt-2">Carregando feed da tarefa...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="py-12 text-center rounded-2xl border-2 border-dashed border-slate-100 p-8">
              <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-700">Nenhum comentário ou anexo ainda</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Seja o primeiro a postar atualizações, dúvidas, prints ou arquivos sobre o andamento desta tarefa.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {comments.map((comment) => {
                const isCommentAuthor = comment.id_usuario === currentUser?.id_usuario;
                const isEditing = editingCommentId === comment.id_comentario;

                const fileUrl = comment.arquivo_url
                  ? comment.arquivo_url.startsWith('http')
                    ? comment.arquivo_url
                    : `${backendBaseUrl}${comment.arquivo_url}`
                  : null;

                if (isCommentAuthor) {
                  // MENSAGEM DO USUÁRIO LOGADO -> ALINHADA À DIREITA
                  return (
                    <div key={comment.id_comentario} className="flex justify-end w-full">
                      <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-xs p-3.5 bg-blue-600 text-white shadow-sm border border-blue-700 text-left">
                        {/* Header do balão */}
                        <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-blue-500/50">
                          <div className="flex items-center gap-1.5 text-xs text-blue-100">
                            <span className="font-bold text-white">Você</span>
                            <span className="text-[10px] text-blue-200">
                              {formatDate(comment.data_criacao)}
                            </span>
                          </div>

                          {/* Ações: Editar e Excluir */}
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => {
                                setEditingCommentId(comment.id_comentario);
                                setEditingText(comment.conteudo);
                              }}
                              title="Editar mensagem"
                              className="p-1 text-blue-200 hover:text-white hover:bg-blue-700/60 rounded transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id_comentario)}
                              title="Excluir mensagem"
                              className="p-1 text-blue-200 hover:text-rose-200 hover:bg-rose-600/40 rounded transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Conteúdo */}
                        {isEditing ? (
                          <div className="mt-2 space-y-2 text-slate-900">
                            <textarea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="w-full text-sm p-2.5 bg-white text-slate-900 rounded-xl focus:outline-none"
                              rows={3}
                            />
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => setEditingCommentId(null)}
                                className="text-xs px-2.5 py-1 text-white hover:bg-blue-700 rounded-lg"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEditComment(comment.id_comentario)}
                                className="text-xs px-3 py-1 bg-white text-blue-600 font-bold rounded-lg shadow-sm"
                              >
                                Salvar Alteração
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">
                            {comment.conteudo}
                          </p>
                        )}

                        {/* Imagem / Print anexado */}
                        {comment.tipo === 'IMAGE' && fileUrl && (
                          <div className="mt-2.5">
                            <div
                              onClick={() => setLightboxImage(fileUrl)}
                              className="inline-block relative rounded-xl overflow-hidden border border-blue-400/40 cursor-pointer group max-w-sm"
                            >
                              <img
                                src={fileUrl}
                                alt={comment.arquivo_nome || 'Print da tarefa'}
                                className="max-h-60 w-auto object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                                Clique para ampliar
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Arquivo / Documento anexado */}
                        {comment.tipo === 'FILE' && fileUrl && (
                          <div className="mt-2.5">
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-700/60 hover:bg-blue-700 text-xs font-medium text-white transition border border-blue-500/40"
                            >
                              <FileText className="w-3.5 h-3.5 text-blue-200" />
                              <span className="font-semibold truncate">{comment.arquivo_nome || 'Arquivo Anexo'}</span>
                              <ExternalLink className="w-3 h-3 text-blue-200" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // MENSAGEM DE OUTROS USUÁRIOS -> ALINHADA À ESQUERDA
                return (
                  <div key={comment.id_comentario} className="flex justify-start w-full">
                    <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tl-xs p-3.5 bg-white text-slate-900 shadow-xs border border-slate-200/90 text-left">
                      {/* Header do balão */}
                      <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-slate-100">
                        <div className="h-6 w-6 rounded-full bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center shrink-0 shadow-xs">
                          {getInitials(comment.usuario?.nome || 'U')}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-900">
                            {comment.usuario?.nome || 'Usuário'}
                          </span>
                          {comment.usuario?.role === 'ROOT' && (
                            <span className="text-[9px] text-amber-700 bg-amber-100 px-1 rounded font-bold">
                              ROOT
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {formatDate(comment.data_criacao)}
                          </span>
                        </div>
                      </div>

                      {/* Conteúdo */}
                      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {comment.conteudo}
                      </p>

                      {/* Imagem / Print anexado */}
                      {comment.tipo === 'IMAGE' && fileUrl && (
                        <div className="mt-2.5">
                          <div
                            onClick={() => setLightboxImage(fileUrl)}
                            className="inline-block relative rounded-xl overflow-hidden border border-slate-200 cursor-pointer group max-w-sm"
                          >
                            <img
                              src={fileUrl}
                              alt={comment.arquivo_nome || 'Print da tarefa'}
                              className="max-h-60 w-auto object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                              Clique para ampliar
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Arquivo / Documento anexado */}
                      {comment.tipo === 'FILE' && fileUrl && (
                        <div className="mt-2.5">
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs font-medium text-slate-800 transition"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            <span className="font-semibold truncate">{comment.arquivo_nome || 'Arquivo Anexo'}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={commentsEndRef} />
            </div>
          )}
        </div>

        {/* =====================================================
            RODAPÉ DO MODAL - FORMULÁRIO DE POSTAGEM
        ====================================================== */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          {selectedFile && (
            <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900 animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5 truncate">
                {selectedFile.type.startsWith('image/') ? (
                  <div className="flex items-center gap-2 truncate">
                    <img
                      src={URL.createObjectURL(selectedFile)}
                      alt="Print colado"
                      className="h-10 w-10 object-cover rounded-lg border border-blue-300 shadow-2xs shrink-0"
                    />
                    <div className="truncate text-left">
                      <span className="font-bold block truncate text-slate-800">{selectedFile.name}</span>
                      <span className="text-blue-700 text-[10px] font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" /> Imagem/Print pronta para envio ({(selectedFile.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                    <div className="truncate text-left">
                      <span className="font-medium truncate text-slate-800">{selectedFile.name}</span>
                      <span className="text-slate-400 text-[10px] block">
                        ({(selectedFile.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-white transition"
                title="Remover anexo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <form onSubmit={handleSendComment} className="flex items-end gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFile(e.target.files[0]);
                }
              }}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Anexar arquivo ou colar printscreen (Ctrl+V)"
              className="p-3 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-slate-200 bg-white transition shrink-0"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <div className="flex-1">
              <textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                onPaste={handlePaste}
                placeholder="Escreva uma mensagem ou cole uma imagem/print (Ctrl+V)..."
                className="w-full text-sm p-3 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendComment(e);
                  }
                }}
              />
            </div>

            <Button
              type="submit"
              disabled={(!newCommentText.trim() && !selectedFile) || isSubmitting}
              isLoading={isSubmitting}
              className="h-[50px] px-5 shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Lightbox / Ampliar Imagem */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md cursor-pointer animate-fadeIn"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={lightboxImage}
              alt="Ampliação"
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-4 -right-4 p-2 bg-white text-slate-900 rounded-full shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmação: Excluir Comentário */}
      <ConfirmModal
        isOpen={commentToDeleteId !== null}
        onClose={() => setCommentToDeleteId(null)}
        onConfirm={handleConfirmDeleteComment}
        isLoading={isDeletingComment}
        title="Excluir Mensagem"
        description="Tem certeza que deseja excluir esta mensagem do histórico da tarefa?"
        confirmText="Excluir Mensagem"
        cancelText="Cancelar"
        variant="danger"
      />

      {/* Modal de Confirmação: Revogar Compartilhamento */}
      <ConfirmModal
        isOpen={isUnshareModalOpen}
        onClose={() => setIsUnshareModalOpen(false)}
        onConfirm={handleConfirmUnshare}
        isLoading={shareLoading}
        title="Revogar Compartilhamento"
        description="Deseja revogar o link de compartilhamento? A tarefa voltará a ser privada e os usuários convidados perderão o acesso."
        confirmText="Revogar Acesso"
        cancelText="Cancelar"
        variant="warning"
      />
    </div>
  );
};
