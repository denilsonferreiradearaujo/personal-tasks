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
  Loader2,
  Plus,
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

  // Estados de novo comentário e upload inline
  const [newCommentText, setNewCommentText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  // Interface de blocos visuais para edição (WYSIWYG por blocos)
  interface ChatBlock {
    id: string;
    type: 'TEXT' | 'IMAGE' | 'FILE';
    text?: string;
    url?: string;
    name?: string;
  }

  // Estados de edição de comentário
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingBlocks, setEditingBlocks] = useState<ChatBlock[]>([]);
  const [activeEditingBlockId, setActiveEditingBlockId] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // Refs para controle de foco, teclado e clique fora na edição
  const editContainerRef = useRef<HTMLDivElement>(null);
  const textareasRef = useRef<{ [key: number]: HTMLTextAreaElement | null }>({});
  const imageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // Estados de compartilhamento
  const [isSharingOpen, setIsSharingOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

  // Preview de imagem ampliada
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const newCommentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Rastreamento persistente da última posição do cursor no campo novo
  const lastNewCommentCursorRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  // Converte o texto com marcações ou anexos legados em blocos visuais para edição
  const parseContentToBlocks = (
    content: string,
    legacyUrl?: string | null,
    legacyName?: string | null,
    legacyTipo?: string | null
  ): ChatBlock[] => {
    const blocks: ChatBlock[] = [];
    const textContent = content || '';

    // Regex global para capturar blocos inline: ![alt](url) ou [arquivo:nome](url)
    const pattern = /(!\[(.*?)\]\((.*?)\)|\[(?:arquivo:)?(.*?)\]\((.*?)\))/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(textContent)) !== null) {
      if (match.index > lastIndex) {
        const textChunk = textContent.substring(lastIndex, match.index).trim();
        if (textChunk) {
          blocks.push({ id: `text-${Date.now()}-${Math.random()}`, type: 'TEXT', text: textChunk });
        }
      }

      const fullMatch = match[0];
      const isImage = fullMatch.startsWith('!');

      if (isImage) {
        blocks.push({
          id: `img-${Date.now()}-${Math.random()}`,
          type: 'IMAGE',
          name: match[2] || 'Imagem anexa',
          url: match[3],
        });
      } else {
        blocks.push({
          id: `file-${Date.now()}-${Math.random()}`,
          type: 'FILE',
          name: match[4] || 'Arquivo anexo',
          url: match[5],
        });
      }

      lastIndex = match.index + fullMatch.length;
    }

    if (lastIndex < textContent.length) {
      const remainingText = textContent.substring(lastIndex).trim();
      if (remainingText) {
        blocks.push({ id: `text-${Date.now()}-${Math.random()}`, type: 'TEXT', text: remainingText });
      }
    }

    // Se tiver anexo legado fora do texto
    if (legacyUrl && !textContent.includes(legacyUrl)) {
      if (legacyTipo === 'IMAGE') {
        blocks.push({
          id: `legacy-img-${Date.now()}`,
          type: 'IMAGE',
          name: legacyName || 'Print da tarefa',
          url: legacyUrl,
        });
      } else {
        blocks.push({
          id: `legacy-file-${Date.now()}`,
          type: 'FILE',
          name: legacyName || 'Arquivo anexo',
          url: legacyUrl,
        });
      }
    }

    if (blocks.length === 0) {
      blocks.push({ id: `text-initial-${Date.now()}`, type: 'TEXT', text: textContent || '' });
    }

    return blocks;
  };

  // Garante que haja áreas de texto editáveis antes, entre e depois das imagens
  const normalizeBlocksWithPaddings = (blocks: ChatBlock[]): ChatBlock[] => {
    const result: ChatBlock[] = [];
    blocks.forEach((b, i) => {
      if (i === 0 && b.type !== 'TEXT') {
        result.push({ id: `text-head-${Date.now()}`, type: 'TEXT', text: '' });
      }
      const prev = result[result.length - 1];
      if (prev && prev.type !== 'TEXT' && b.type !== 'TEXT') {
        result.push({ id: `text-mid-${Date.now()}-${i}`, type: 'TEXT', text: '' });
      }
      result.push(b);
    });
    const last = result[result.length - 1];
    if (last && last.type !== 'TEXT') {
      result.push({ id: `text-tail-${Date.now()}`, type: 'TEXT', text: '' });
    }
    return result;
  };

  // Converte a lista de blocos visuais em texto limpo para persistência
  const serializeBlocksToContent = (blocks: ChatBlock[]): string => {
    return blocks
      .map((b) => {
        if (b.type === 'TEXT') return (b.text || '').trim();
        if (b.type === 'IMAGE') return `![${b.name || 'Imagem'}](${b.url})`;
        if (b.type === 'FILE') return `[arquivo:${b.name || 'Arquivo'}](${b.url})`;
        return '';
      })
      .filter(Boolean)
      .join('\n\n');
  };

  // Interface e extrator de mídias do texto da mensagem
  interface MediaItem {
    raw: string;
    nome: string;
    url: string;
    isImage: boolean;
  }

  const extractMediasFromText = (text: string): MediaItem[] => {
    if (!text) return [];
    const medias: MediaItem[] = [];

    // Imagens: ![nome](url)
    const imgRegex = /!\[(.*?)\]\((.*?)\)/g;
    let match;
    while ((match = imgRegex.exec(text)) !== null) {
      medias.push({ raw: match[0], nome: match[1] || 'Imagem', url: match[2], isImage: true });
    }

    // Arquivos: [arquivo:nome](url)
    const fileRegex = /\[(?:arquivo:)?(.*?)\]\((.*?)\)/g;
    while ((match = fileRegex.exec(text)) !== null) {
      if (match.index > 0 && text[match.index - 1] === '!') continue;
      medias.push({ raw: match[0], nome: match[1] || 'Arquivo', url: match[2], isImage: false });
    }

    return medias;
  };

  // Upload imediato de mídia / anexo para inserção no chat
  const uploadMediaFile = async (file: File): Promise<{ url: string; nome: string; tipo: 'IMAGE' | 'FILE' } | null> => {
    try {
      setIsUploadingMedia(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/tasks/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    } catch (err: any) {
      showModalToast('error', err.response?.data?.message || 'Falha ao fazer upload da mídia.');
      return null;
    } finally {
      setIsUploadingMedia(false);
    }
  };

  // Inserção da tag de mídia na posição exata e garantida do cursor
  const insertMediaAtCursor = (
    textarea: HTMLTextAreaElement | null,
    setVal: React.Dispatch<React.SetStateAction<string>>,
    mediaTag: string,
    savedCursor?: { start: number; end: number }
  ) => {
    setVal((currentVal) => {
      let start = savedCursor?.start ?? textarea?.selectionStart ?? currentVal.length;
      let end = savedCursor?.end ?? textarea?.selectionEnd ?? currentVal.length;

      if (typeof start !== 'number' || isNaN(start) || start < 0) {
        start = currentVal.length;
      }
      if (typeof end !== 'number' || isNaN(end) || end < start) {
        end = start;
      }

      start = Math.min(start, currentVal.length);
      end = Math.min(end, currentVal.length);

      const before = currentVal.substring(0, start);
      const after = currentVal.substring(end);

      const prefix = before.endsWith('\n') || !before ? '' : '\n\n';
      const suffix = after.startsWith('\n') || !after ? '' : '\n\n';
      const insertion = `${prefix}${mediaTag}${suffix}`;

      const newVal = before + insertion + after;
      const newPos = start + insertion.length;

      // Atualiza também o ref persistente para manter coerência
      lastNewCommentCursorRef.current = { start: newPos, end: newPos };

      setTimeout(() => {
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(newPos, newPos);
        }
      }, 50);

      return newVal;
    });
  };

  // Handler que faz upload e insere na sequência usando a posição gravada
  const handleUploadAndInsert = async (
    file: File,
    cursorPos?: { start: number; end: number }
  ) => {
    const uploaded = await uploadMediaFile(file);
    if (!uploaded) return;

    const tag = uploaded.tipo === 'IMAGE'
      ? `![${uploaded.nome}](${uploaded.url})`
      : `[arquivo:${uploaded.nome}](${uploaded.url})`;

    insertMediaAtCursor(
      newCommentTextareaRef.current,
      setNewCommentText,
      tag,
      cursorPos || lastNewCommentCursorRef.current
    );
  };

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

  // Capturar e anexar imagem direto da área de transferência com cursor síncrono
  // Capturar e anexar imagem direto da área de transferência com cursor síncrono para novo comentário
  const handlePaste = async (
    e: React.ClipboardEvent | ClipboardEvent,
    forcedCursorPos?: { start: number; end: number }
  ) => {
    const clipboardData = (e as any).clipboardData;
    if (!clipboardData) return;

    const items = clipboardData.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();

            const cursorPos = forcedCursorPos || {
              start: newCommentTextareaRef.current?.selectionStart ?? lastNewCommentCursorRef.current.start,
              end: newCommentTextareaRef.current?.selectionEnd ?? lastNewCommentCursorRef.current.end,
            };

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const ext = file.type.includes('png') ? 'png' : file.type.includes('jpeg') ? 'jpg' : 'png';
            const renamedFile = new File([file], `printscreen-${timestamp}.${ext}`, {
              type: file.type || 'image/png',
            });
            await handleUploadAndInsert(renamedFile, cursorPos);
            break;
          }
        }
      }
    }
  };

  // Listener global de paste no modal para capturar qualquer Ctrl+V de imagem quando fora de textareas
  useEffect(() => {
    if (!isOpen) return;

    const onGlobalPaste = async (e: ClipboardEvent) => {
      // Se o evento ocorreu num textarea ou input, deixa o onPaste do próprio elemento tratar
      const activeTag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase();
      if (activeTag === 'textarea' || activeTag === 'input') {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (!file) continue;

          e.preventDefault();
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const ext = file.type.includes('png') ? 'png' : file.type.includes('jpeg') ? 'jpg' : 'png';
          const renamedFile = new File([file], `printscreen-${timestamp}.${ext}`, {
            type: file.type || 'image/png',
          });

          if (editingCommentId !== null) {
            // Em modo de edição, anexa como novo bloco visual
            const uploaded = await uploadMediaFile(renamedFile);
            if (uploaded) {
              setEditingBlocks((prev) => [
                ...prev,
                {
                  id: `img-${Date.now()}`,
                  type: 'IMAGE',
                  name: uploaded.nome,
                  url: uploaded.url,
                },
                { id: `text-${Date.now() + 1}`, type: 'TEXT', text: '' },
              ]);
            }
          } else {
            // No campo de novo comentário
            await handleUploadAndInsert(renamedFile, lastNewCommentCursorRef.current);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', onGlobalPaste);
    return () => {
      window.removeEventListener('paste', onGlobalPaste);
    };
  }, [isOpen, editingCommentId]);

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

  // Iniciar modo de edição de comentário transformando em blocos visuais limpos
  const startEditingComment = (comment: TaskComment) => {
    setEditingCommentId(comment.id_comentario);
    const blocks = parseContentToBlocks(
      comment.conteudo,
      comment.arquivo_url,
      comment.arquivo_nome,
      comment.tipo
    );
    setEditingBlocks(normalizeBlocksWithPaddings(blocks));
  };

  // Cancelar edição
  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingBlocks([]);
    setSelectedImageIndex(null);
  };

  // Fecha o modo de edição automaticamente se o usuário clicar fora
  useEffect(() => {
    if (editingCommentId === null) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (lightboxImage) return;
      if (editContainerRef.current && !editContainerRef.current.contains(e.target as Node)) {
        handleCancelEditComment();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 120);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingCommentId, lightboxImage]);

  // Atualizar o texto de um bloco específico
  const handleUpdateTextBlock = (index: number, newText: string) => {
    setEditingBlocks((prev) =>
      prev.map((block, i) => (i === index ? { ...block, text: newText } : block))
    );
  };

  // Excluir um bloco (imagem, arquivo ou texto) com fusão automática e limpeza de divisões vazias
  const handleDeleteBlock = (index: number) => {
    setEditingBlocks((prev) => {
      const remaining = prev.filter((_, i) => i !== index);

      // Mescla textos consecutivos para nunca deixar divs fragmentadas ou vazias
      const merged: ChatBlock[] = [];
      for (const b of remaining) {
        const last = merged[merged.length - 1];
        if (last && last.type === 'TEXT' && b.type === 'TEXT') {
          const sep = last.text && b.text ? '\n' : '';
          last.text = `${last.text || ''}${sep}${b.text || ''}`;
        } else {
          merged.push({ ...b });
        }
      }

      if (merged.length === 0) {
        return [{ id: `text-${Date.now()}`, type: 'TEXT', text: '' }];
      }

      return normalizeBlocksWithPaddings(merged);
    });
  };

  // Colar imagem via Ctrl+V dentro de um bloco de texto específico (divide o texto e põe a foto no meio)
  const handlePasteOnBlock = async (
    e: React.ClipboardEvent<HTMLTextAreaElement>,
    blockIndex: number
  ) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    const items = clipboardData.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          const target = e.currentTarget;
          const cursorPos = target.selectionStart ?? 0;
          const currentText = editingBlocks[blockIndex]?.text || '';
          const beforeText = currentText.substring(0, cursorPos);
          const afterText = currentText.substring(cursorPos);

          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const ext = file.type.includes('png') ? 'png' : file.type.includes('jpeg') ? 'jpg' : 'png';
          const renamedFile = new File([file], `printscreen-${timestamp}.${ext}`, {
            type: file.type || 'image/png',
          });

          const uploaded = await uploadMediaFile(renamedFile);
          if (uploaded) {
            setEditingBlocks((prev) => {
              const next: ChatBlock[] = [];
              prev.forEach((b, idx) => {
                if (idx === blockIndex) {
                  if (beforeText.trim() || !afterText.trim()) {
                    next.push({ id: b.id, type: 'TEXT', text: beforeText });
                  }
                  next.push({
                    id: `img-${Date.now()}`,
                    type: 'IMAGE',
                    name: uploaded.nome,
                    url: uploaded.url,
                  });
                  next.push({
                    id: `text-${Date.now() + 1}`,
                    type: 'TEXT',
                    text: afterText,
                  });
                } else {
                  next.push(b);
                }
              });
              return next;
            });
          }
          return;
        }
      }
    }
  };

  // Upload de imagem ou anexo via botão na barra de edição
  const handleUploadMediaInEdit = async (file: File) => {
    const uploaded = await uploadMediaFile(file);
    if (!uploaded) return;

    setEditingBlocks((prev) => [
      ...prev,
      {
        id: `${uploaded.tipo.toLowerCase()}-${Date.now()}`,
        type: uploaded.tipo,
        name: uploaded.nome,
        url: uploaded.url,
      },
      { id: `text-${Date.now() + 1}`, type: 'TEXT', text: '' },
    ]);
  };

  // Enviar novo comentário/print/arquivo na sequência
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTask) return;
    if (!newCommentText.trim() && !selectedFile) return;

    try {
      setIsSubmitting(true);
      const text = newCommentText.trim();
      const hasImages = text.includes('![');
      const hasFiles = text.includes('[arquivo:');
      const tipo = hasImages ? 'IMAGE' : hasFiles ? 'FILE' : 'TEXT';

      const formData = new FormData();
      formData.append('conteudo', text);
      formData.append('tipo', tipo);

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

  // Salvar edição de comentário com serialização limpa de blocos
  const handleSaveEditComment = async (commentId: number) => {
    const content = serializeBlocksToContent(editingBlocks);
    if (!content.trim() && editingBlocks.length === 0) return;

    try {
      const hasImages = editingBlocks.some((b) => b.type === 'IMAGE');
      const hasFiles = editingBlocks.some((b) => b.type === 'FILE');
      const newTipo = hasImages ? 'IMAGE' : hasFiles ? 'FILE' : 'TEXT';

      await api.put(`/tasks/comments/${commentId}`, {
        conteudo: content,
        arquivo_url: null,
        arquivo_nome: null,
        tipo: newTipo,
      });

      setEditingCommentId(null);
      setEditingBlocks([]);
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

  // Renderizador inteligente de mensagem com blocos ordenados de texto e mídias
  const renderChatMessageContent = (comment: TaskComment, isCurrentUser: boolean) => {
    const content = comment.conteudo || '';

    // Regex global para capturar blocos inline: ![alt](url) ou [arquivo:nome](url)
    const pattern = /(!\[(.*?)\]\((.*?)\)|\[(?:arquivo:)?(.*?)\]\((.*?)\))/g;

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(content)) !== null) {
      // Texto antes do bloco
      if (match.index > lastIndex) {
        const textChunk = content.substring(lastIndex, match.index).trim();
        if (textChunk) {
          elements.push(
            <p
              key={`text-${lastIndex}`}
              className={`text-sm leading-relaxed whitespace-pre-wrap ${
                isCurrentUser ? 'text-white' : 'text-slate-800'
              }`}
            >
              {textChunk}
            </p>
          );
        }
      }

      const fullMatch = match[0];
      const isImage = fullMatch.startsWith('!');

      if (isImage) {
        const alt = match[2] || 'Imagem da tarefa';
        let url = match[3] || '';
        if (!url.startsWith('http')) {
          url = `${backendBaseUrl}${url}`;
        }
        elements.push(
          <div key={`img-${match.index}`} className="my-2">
            <div
              onClick={() => setLightboxImage(url)}
              className={`inline-block relative rounded-xl overflow-hidden border cursor-pointer group max-w-sm ${
                isCurrentUser ? 'border-blue-400/40' : 'border-slate-200'
              }`}
            >
              <img
                src={url}
                alt={alt}
                className="max-h-60 w-auto object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                Clique para ampliar
              </div>
            </div>
          </div>
        );
      } else {
        const fileName = match[4] || 'Arquivo anexo';
        let url = match[5] || '';
        if (!url.startsWith('http')) {
          url = `${backendBaseUrl}${url}`;
        }
        elements.push(
          <div key={`file-${match.index}`} className="my-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition border ${
                isCurrentUser
                  ? 'bg-blue-700/60 hover:bg-blue-700 text-white border-blue-500/40'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-800 border-slate-200'
              }`}
            >
              <FileText className={`w-3.5 h-3.5 ${isCurrentUser ? 'text-blue-200' : 'text-blue-600'}`} />
              <span className="font-semibold truncate">{fileName}</span>
              <ExternalLink className={`w-3 h-3 ${isCurrentUser ? 'text-blue-200' : 'text-slate-400'}`} />
            </a>
          </div>
        );
      }

      lastIndex = match.index + fullMatch.length;
    }

    // Texto após a última mídia
    if (lastIndex < content.length) {
      const remainingText = content.substring(lastIndex).trim();
      if (remainingText) {
        elements.push(
          <p
            key={`text-${lastIndex}`}
            className={`text-sm leading-relaxed whitespace-pre-wrap ${
              isCurrentUser ? 'text-white' : 'text-slate-800'
            }`}
          >
            {remainingText}
          </p>
        );
      }
    }

    // Fallback: se nenhum bloco inline foi encontrado mas há texto
    if (elements.length === 0 && content.trim()) {
      elements.push(
        <p
          key="text-pure"
          className={`text-sm leading-relaxed whitespace-pre-wrap ${
            isCurrentUser ? 'text-white' : 'text-slate-800'
          }`}
        >
          {content}
        </p>
      );
    }

    // Tratamento de anexo legado caso exista arquivo_url e não esteja no texto
    if (comment.arquivo_url && !content.includes(comment.arquivo_url)) {
      const legacyUrl = comment.arquivo_url.startsWith('http')
        ? comment.arquivo_url
        : `${backendBaseUrl}${comment.arquivo_url}`;

      if (comment.tipo === 'IMAGE') {
        elements.push(
          <div key="legacy-img" className="mt-2.5">
            <div
              onClick={() => setLightboxImage(legacyUrl)}
              className={`inline-block relative rounded-xl overflow-hidden border cursor-pointer group max-w-sm ${
                isCurrentUser ? 'border-blue-400/40' : 'border-slate-200'
              }`}
            >
              <img
                src={legacyUrl}
                alt={comment.arquivo_nome || 'Print da tarefa'}
                className="max-h-60 w-auto object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                Clique para ampliar
              </div>
            </div>
          </div>
        );
      } else if (comment.tipo === 'FILE') {
        elements.push(
          <div key="legacy-file" className="mt-2.5">
            <a
              href={legacyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition border ${
                isCurrentUser
                  ? 'bg-blue-700/60 hover:bg-blue-700 text-white border-blue-500/40'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-800 border-slate-200'
              }`}
            >
              <FileText className={`w-3.5 h-3.5 ${isCurrentUser ? 'text-blue-200' : 'text-blue-600'}`} />
              <span className="font-semibold truncate">{comment.arquivo_nome || 'Arquivo Anexo'}</span>
              <ExternalLink className={`w-3 h-3 ${isCurrentUser ? 'text-blue-200' : 'text-slate-400'}`} />
            </a>
          </div>
        );
      }
    }

    return <div className="space-y-1.5">{elements}</div>;
  };

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
                              onClick={() => startEditingComment(comment)}
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

                        {/* Conteúdo / Modo de Edição Visual Contínuo e Fluido */}
                        {isEditing ? (
                          <div
                            ref={editContainerRef}
                            className="mt-2 bg-white rounded-2xl p-3.5 border border-blue-200 text-slate-800 shadow-sm space-y-2"
                          >
                            <div className="flex items-center justify-between text-xs text-slate-400 pb-1.5 border-b border-slate-100">
                              <span className="font-semibold text-slate-600">Editar mensagem</span>
                              <span className="text-[11px]">Cole prints com Ctrl+V onde quiser</span>
                            </div>

                            {/* Conteúdo contínuo (sem caixas ou divisões aparentes) */}
                            <div className="space-y-1">
                              {editingBlocks.map((block, idx) => {
                                if (block.type === 'TEXT') {
                                  return (
                                    <textarea
                                      key={block.id}
                                      ref={(el) => {
                                        textareasRef.current[idx] = el;
                                      }}
                                      value={block.text || ''}
                                      onChange={(e) => {
                                        handleUpdateTextBlock(idx, e.target.value);
                                        e.target.style.height = 'auto';
                                        e.target.style.height = `${e.target.scrollHeight}px`;
                                      }}
                                      onPaste={(e) => handlePasteOnBlock(e, idx)}
                                      onKeyDown={(e) => {
                                        const target = e.currentTarget;
                                        const isAtStart = target.selectionStart === 0 && target.selectionEnd === 0;
                                        const isAtEnd =
                                          target.selectionStart === target.value.length &&
                                          target.selectionEnd === target.value.length;

                                        // Backspace no início: se o bloco anterior for imagem ou arquivo, deleta pelo teclado
                                        if (e.key === 'Backspace' && isAtStart && idx > 0) {
                                          if (editingBlocks[idx - 1]?.type === 'IMAGE' || editingBlocks[idx - 1]?.type === 'FILE') {
                                            e.preventDefault();
                                            handleDeleteBlock(idx - 1);
                                            return;
                                          }
                                        }

                                        // Delete no final: se o próximo bloco for imagem ou arquivo, deleta pelo teclado
                                        if (e.key === 'Delete' && isAtEnd && idx < editingBlocks.length - 1) {
                                          if (editingBlocks[idx + 1]?.type === 'IMAGE' || editingBlocks[idx + 1]?.type === 'FILE') {
                                            e.preventDefault();
                                            handleDeleteBlock(idx + 1);
                                            return;
                                          }
                                        }

                                        // Seta para esquerda/cima no início: foca na imagem anterior
                                        if ((e.key === 'ArrowLeft' || e.key === 'ArrowUp') && isAtStart && idx > 0) {
                                          e.preventDefault();
                                          if (editingBlocks[idx - 1]?.type === 'IMAGE') {
                                            imageRefs.current[idx - 1]?.focus();
                                          } else {
                                            const prevEl = textareasRef.current[idx - 1];
                                            if (prevEl) {
                                              prevEl.focus();
                                              prevEl.setSelectionRange(prevEl.value.length, prevEl.value.length);
                                            }
                                          }
                                          return;
                                        }

                                        // Seta para direita/baixo no final: foca na imagem seguinte
                                        if ((e.key === 'ArrowRight' || e.key === 'ArrowDown') && isAtEnd && idx < editingBlocks.length - 1) {
                                          e.preventDefault();
                                          if (editingBlocks[idx + 1]?.type === 'IMAGE') {
                                            imageRefs.current[idx + 1]?.focus();
                                          } else {
                                            const nextEl = textareasRef.current[idx + 1];
                                            if (nextEl) {
                                              nextEl.focus();
                                              nextEl.setSelectionRange(0, 0);
                                            }
                                          }
                                          return;
                                        }
                                      }}
                                      placeholder={editingBlocks.length <= 2 && !block.text ? "Digite sua mensagem... (Cole prints com Ctrl+V)" : ""}
                                      rows={Math.max(1, (block.text || '').split('\n').length)}
                                      className="w-full text-sm text-slate-800 bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-1 resize-none leading-relaxed block placeholder:text-slate-300"
                                    />
                                  );
                                }

                                if (block.type === 'IMAGE') {
                                  const imgUrl = block.url?.startsWith('http')
                                    ? block.url
                                    : `${backendBaseUrl}${block.url}`;

                                  return (
                                    <div key={block.id} className="flex items-center gap-2 flex-wrap my-1.5">
                                      <div
                                        ref={(el) => {
                                          imageRefs.current[idx] = el;
                                        }}
                                        tabIndex={0}
                                        onFocus={() => setSelectedImageIndex(idx)}
                                        onBlur={() => setSelectedImageIndex(null)}
                                        onKeyDown={(e) => {
                                          // Tecla Delete ou Backspace deleta a imagem selecionada pelo teclado!
                                          if (e.key === 'Delete' || e.key === 'Backspace') {
                                            e.preventDefault();
                                            handleDeleteBlock(idx);
                                            setTimeout(() => {
                                              const targetEl = textareasRef.current[idx - 1] || textareasRef.current[idx];
                                              if (targetEl) targetEl.focus();
                                            }, 50);
                                            return;
                                          }

                                          // Seta para esquerda ou cima: volta para o texto anterior
                                          if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            const prevEl = textareasRef.current[idx - 1];
                                            if (prevEl) {
                                              prevEl.focus();
                                              prevEl.setSelectionRange(prevEl.value.length, prevEl.value.length);
                                            }
                                            return;
                                          }

                                          // Seta para direita ou baixo: avança para o texto seguinte
                                          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            const nextEl = textareasRef.current[idx + 1];
                                            if (nextEl) {
                                              nextEl.focus();
                                              nextEl.setSelectionRange(0, 0);
                                            }
                                            return;
                                          }
                                        }}
                                        className={`relative inline-block group max-w-sm rounded-xl outline-none transition cursor-pointer ${
                                          selectedImageIndex === idx ? 'ring-2 ring-blue-500 shadow-md' : ''
                                        }`}
                                      >
                                        <img
                                          src={imgUrl}
                                          alt="Imagem anexada"
                                          onClick={() => imageRefs.current[idx]?.focus()}
                                          className="max-h-60 max-w-full rounded-xl object-contain border border-slate-200 shadow-xs hover:opacity-95 transition"
                                        />
                                        {/* Pequeno 'x' limpo na parte superior direita da imagem */}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteBlock(idx);
                                          }}
                                          className="absolute -top-2 -right-2 w-5.5 h-5.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-110 z-10"
                                          title="Excluir imagem"
                                        >
                                          <X className="w-3.5 h-3.5 stroke-[2.5]" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                }

                                if (block.type === 'FILE') {
                                  const fileUrl = block.url?.startsWith('http')
                                    ? block.url
                                    : `${backendBaseUrl}${block.url}`;

                                  return (
                                    <div
                                      key={block.id}
                                      className="relative inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 my-1"
                                    >
                                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                      <a
                                        href={fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-semibold text-blue-600 hover:underline truncate max-w-[200px]"
                                      >
                                        {block.name || 'Arquivo anexo'}
                                      </a>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteBlock(idx)}
                                        className="ml-1 text-slate-400 hover:text-rose-600 p-0.5 rounded transition"
                                        title="Excluir anexo"
                                      >
                                        <X className="w-3.5 h-3.5 text-rose-500" />
                                      </button>
                                    </div>
                                  );
                                }

                                return null;
                              })}
                            </div>

                            {/* Barra de Ações da Edição com ícones limpos (sem texto) */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                              <div>
                                <input
                                  type="file"
                                  ref={editFileInputRef}
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleUploadMediaInEdit(e.target.files[0]);
                                      e.target.value = '';
                                    }
                                  }}
                                  className="hidden"
                                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                                />
                                <button
                                  type="button"
                                  disabled={isUploadingMedia}
                                  onClick={() => editFileInputRef.current?.click()}
                                  className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-slate-200 bg-white transition shrink-0"
                                  title="Anexar imagem ou arquivo"
                                >
                                  {isUploadingMedia ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                  ) : (
                                    <Paperclip className="w-4 h-4" />
                                  )}
                                </button>
                              </div>

                              <div>
                                <button
                                  type="button"
                                  disabled={isUploadingMedia}
                                  onClick={() => handleSaveEditComment(comment.id_comentario)}
                                  className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition flex items-center justify-center shrink-0"
                                  title="Salvar alteração"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          renderChatMessageContent(comment, true)
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

                      {/* Conteúdo Sequencial */}
                      {renderChatMessageContent(comment, false)}
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
          {/* Miniaturas de mídias presentes no novo comentário */}
          {extractMediasFromText(newCommentText).length > 0 && (
            <div className="mb-2 p-2 bg-blue-50/70 border border-blue-200 rounded-xl flex flex-wrap gap-2 animate-in fade-in duration-150">
              {extractMediasFromText(newCommentText).map((m, idx) => {
                const mediaUrl = m.url.startsWith('http') ? m.url : `${backendBaseUrl}${m.url}`;
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-1.5 bg-white border border-blue-200 rounded-lg shadow-2xs text-xs text-slate-800"
                  >
                    {m.isImage ? (
                      <img src={mediaUrl} alt={m.nome} className="h-8 w-8 object-cover rounded shrink-0 border border-slate-200" />
                    ) : (
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    )}
                    <div className="text-left">
                      <span className="block max-w-[130px] truncate font-bold text-slate-800 text-[11px]">{m.nome}</span>
                      <span className="text-[10px] text-emerald-600 font-semibold">Anexo pronto</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const rawIndex = newCommentText.indexOf(m.raw);
                        const cleaned = newCommentText
                          .replace(m.raw, '')
                          .replace(/\n\s*\n\s*\n/g, '\n\n')
                          .trim();
                        setNewCommentText(cleaned);
                        if (rawIndex >= 0) {
                          const targetPos = Math.min(rawIndex, cleaned.length);
                          lastNewCommentCursorRef.current = { start: targetPos, end: targetPos };
                          setTimeout(() => {
                            if (newCommentTextareaRef.current) {
                              newCommentTextareaRef.current.focus();
                              newCommentTextareaRef.current.setSelectionRange(targetPos, targetPos);
                            }
                          }, 50);
                        }
                      }}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-50 transition"
                      title="Remover anexo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {isUploadingMedia && (
            <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-blue-700 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Fazendo upload da imagem/arquivo para o histórico...</span>
            </div>
          )}

          <form onSubmit={handleSendComment} className="flex items-end gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleUploadAndInsert(e.target.files[0], lastNewCommentCursorRef.current);
                  e.target.value = '';
                }
              }}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            />

            <button
              type="button"
              disabled={isUploadingMedia}
              onClick={() => fileInputRef.current?.click()}
              title="Anexar arquivo ou colar printscreen (Ctrl+V) onde o cursor estiver"
              className="p-3 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-slate-200 bg-white transition shrink-0"
            >
              {isUploadingMedia ? (
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
            </button>

            <div className="flex-1">
              <textarea
                ref={newCommentTextareaRef}
                value={newCommentText}
                onChange={(e) => {
                  setNewCommentText(e.target.value);
                  lastNewCommentCursorRef.current = {
                    start: e.target.selectionStart,
                    end: e.target.selectionEnd,
                  };
                }}
                onSelect={(e: any) => {
                  lastNewCommentCursorRef.current = {
                    start: e.target.selectionStart,
                    end: e.target.selectionEnd,
                  };
                }}
                onClick={(e: any) => {
                  lastNewCommentCursorRef.current = {
                    start: e.target.selectionStart,
                    end: e.target.selectionEnd,
                  };
                }}
                onKeyUp={(e: any) => {
                  lastNewCommentCursorRef.current = {
                    start: e.target.selectionStart,
                    end: e.target.selectionEnd,
                  };
                }}
                onPaste={(e) => {
                  const target = e.currentTarget;
                  const pos = { start: target.selectionStart, end: target.selectionEnd };
                  lastNewCommentCursorRef.current = pos;
                  handlePaste(e, pos);
                }}
                placeholder="Escreva parágrafos, cole prints (Ctrl+V) ou anexe arquivos na sequência desejada..."
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
              disabled={!newCommentText.trim() || isSubmitting || isUploadingMedia}
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
