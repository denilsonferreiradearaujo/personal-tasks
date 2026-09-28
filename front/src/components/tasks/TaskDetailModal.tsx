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
} from 'lucide-react';
import { Task, TaskComment } from '../../types';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatDate, getInitials } from '../../lib/utils';

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated?: () => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  isOpen,
  onClose,
  onTaskUpdated,
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
      setComments(res.data.comentarios || []);
    } catch (err) {
      console.error('Erro ao carregar detalhes da tarefa:', err);
    } finally {
      if (!silent) {
        setIsLoadingComments(false);
      }
    }
  };

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
      alert(err.response?.data?.message || 'Erro ao enviar comentário.');
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
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao salvar alteração.');
    }
  };

  // Excluir comentário
  const handleDeleteComment = async (commentId: number) => {
    if (confirm('Tem certeza que deseja excluir esta mensagem?')) {
      try {
        await api.delete(`/tasks/comments/${commentId}`);
        if (currentTask) {
          await loadTaskDetails(currentTask.id_tarefa);
          if (onTaskUpdated) onTaskUpdated();
        }
      } catch (err: any) {
        alert(err.response?.data?.message || 'Erro ao excluir mensagem.');
      }
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
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao compartilhar tarefa.');
    } finally {
      setShareLoading(false);
    }
  };

  // Revogar compartilhamento
  const handleUnshareTask = async () => {
    if (!currentTask) return;
    if (confirm('Deseja revogar o compartilhamento? A tarefa voltará a ser privada.')) {
      try {
        setShareLoading(true);
        await api.delete(`/tasks/${currentTask.id_tarefa}/share`);
        await loadTaskDetails(currentTask.id_tarefa);
        if (onTaskUpdated) onTaskUpdated();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Erro ao revogar compartilhamento.');
      } finally {
        setShareLoading(false);
      }
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

  const isOwner = currentTask.id_usuario === currentUser?.id_usuario;
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

            <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                Criada por: <strong>{currentTask.nome || 'Desconhecido'}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {formatDate(currentTask.data_cadastro)}
              </span>
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

              {currentTask.isCompartilhada && (
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
            <div className="space-y-4">
              {comments.map((comment) => {
                const isCommentAuthor = comment.id_usuario === currentUser?.id_usuario;
                const isEditing = editingCommentId === comment.id_comentario;

                const fileUrl = comment.arquivo_url
                  ? comment.arquivo_url.startsWith('http')
                    ? comment.arquivo_url
                    : `${backendBaseUrl}${comment.arquivo_url}`
                  : null;

                return (
                  <div
                    key={comment.id_comentario}
                    className={`rounded-2xl p-4 transition-all border ${
                      isCommentAuthor
                        ? 'bg-blue-50/40 border-blue-100'
                        : 'bg-white border-slate-200/80 shadow-sm'
                    }`}
                  >
                    {/* Cabeçalho do Post */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2.5">
                        <div className="h-8 w-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                          {getInitials(comment.usuario?.nome || 'User')}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{comment.usuario?.nome || 'Usuário'}</span>
                            {isCommentAuthor && (
                              <span className="text-[10px] text-blue-600 bg-blue-100 px-1.5 py-0.2 rounded font-semibold">
                                Você
                              </span>
                            )}
                            {comment.usuario?.role === 'ROOT' && (
                              <span className="text-[10px] text-amber-700 bg-amber-100 px-1 rounded font-bold">
                                ROOT
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {formatDate(comment.data_criacao)}
                          </span>
                        </div>
                      </div>

                      {/* Botões de Ação: EXCLUSIVOS PARA O AUTOR */}
                      {isCommentAuthor && (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => {
                              setEditingCommentId(comment.id_comentario);
                              setEditingText(comment.conteudo);
                            }}
                            title="Editar comentário"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteComment(comment.id_comentario)}
                            title="Excluir comentário"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Conteúdo da Mensagem */}
                    {isEditing ? (
                      <div className="mt-2 space-y-2">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full text-sm p-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                          rows={3}
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingCommentId(null)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSaveEditComment(comment.id_comentario)}
                          >
                            Salvar Alteração
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap pl-10">
                        {comment.conteudo}
                      </p>
                    )}

                    {/* Imagem / Print anexado */}
                    {comment.tipo === 'IMAGE' && fileUrl && (
                      <div className="mt-3 pl-10">
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
                      <div className="mt-3 pl-10">
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 text-xs font-medium text-slate-800 transition"
                        >
                          <FileText className="w-4 h-4 text-blue-600" />
                          <span className="font-semibold">{comment.arquivo_nome || 'Arquivo Anexo'}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      </div>
                    )}
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
            <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
              <div className="flex items-center gap-2 truncate">
                {selectedFile.type.startsWith('image/') ? (
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                ) : (
                  <FileText className="w-4 h-4 text-blue-600" />
                )}
                <span className="font-medium truncate">{selectedFile.name}</span>
                <span className="text-slate-400 text-[10px]">
                  ({(selectedFile.size / 1024).toFixed(0)} KB)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-rose-500 hover:text-rose-700 font-bold p-1"
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
              title="Anexar print, imagem ou arquivo"
              className="p-3 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-slate-200 bg-white transition"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <div className="flex-1">
              <textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Escreva uma mensagem, atualização ou cole instruções sobre a tarefa..."
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
              className="h-[50px] px-5"
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
    </div>
  );
};
