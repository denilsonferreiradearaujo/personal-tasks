import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { ShareTaskDto } from './dto/share-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async create(createTaskDto: CreateTaskDto, currentUserId?: number) {
    const targetUserId = createTaskDto.id_usuario || currentUserId;

    if (!targetUserId) {
      throw new BadRequestException('ID do usuário criador não informado.');
    }

    const userExists = await this.prisma.user.findUnique({
      where: { id_usuario: targetUserId },
    });

    if (!userExists) {
      throw new BadRequestException(`Usuário #${targetUserId} não existe.`);
    }

    // Gera um shareToken único por padrão para caso a tarefa seja compartilhada
    const shareToken = crypto.randomBytes(16).toString('hex');

    const task = await this.prisma.tarefa.create({
      data: {
        id_usuario: targetUserId,
        descricao: createTaskDto.descricao,
        equipe: createTaskDto.equipe,
        prioridade: createTaskDto.prioridade.toLowerCase(),
        status: createTaskDto.status || 'Não Iniciado',
        isCompartilhada: false, // Inicialmente privada do criador!
        shareToken,
      },
      include: {
        usuario: {
          select: { id_usuario: true, nome: true, email: true },
        },
      },
    });

    return {
      ...task,
      nome: task.usuario.nome,
    };
  }

  async findAll(
    query?: { status?: string; prioridade?: string; equipe?: string; search?: string; onlyMine?: string },
    currentUser?: { id_usuario: number; email: string; role: string },
  ) {
    const where: any = {};

    if (query?.status) {
      where.status = { contains: query.status };
    }
    if (query?.prioridade) {
      where.prioridade = query.prioridade.toLowerCase();
    }
    if (query?.equipe) {
      where.equipe = { contains: query.equipe };
    }
    if (query?.search) {
      where.OR = [
        { descricao: { contains: query.search } },
        { equipe: { contains: query.search } },
        { usuario: { nome: { contains: query.search } } },
      ];
    }

    // Regra de Privacidade e Compartilhamento
    if (currentUser) {
      const isPrivileged = currentUser.role === 'ADMIN' || currentUser.role === 'ROOT';

      if (!isPrivileged || query?.onlyMine === 'true') {
        // Usuário comum vê ESTRITAMENTE:
        // 1. Suas próprias tarefas (criadas por ele)
        // 2. Tarefas compartilhadas diretamente com seu e-mail ou seu ID de usuário
        const privacyFilter = {
          OR: [
            { id_usuario: currentUser.id_usuario },
            {
              compartilhamentos: {
                some: {
                  OR: [
                    { id_usuario: currentUser.id_usuario },
                    { email: currentUser.email.toLowerCase() },
                  ],
                },
              },
            },
          ],
        };

        if (where.OR) {
          where.AND = [{ OR: where.OR }, privacyFilter];
          delete where.OR;
        } else {
          where.AND = [privacyFilter];
        }
      }
    } else {
      // Se não há usuário autenticado, não deve retornar tarefas privadas de ninguém
      where.id_tarefa = -1;
    }

    const tasks = await this.prisma.tarefa.findMany({
      where,
      include: {
        usuario: {
          select: {
            id_usuario: true,
            nome: true,
            email: true,
          },
        },
        _count: {
          select: { comentarios: true, compartilhamentos: true },
        },
      },
      orderBy: { data_cadastro: 'desc' },
    });

    return tasks.map((t) => {
      const isOwner = currentUser ? t.id_usuario === currentUser.id_usuario : false;
      const isSharedWithMe = currentUser ? t.id_usuario !== currentUser.id_usuario : false;

      return {
        id_tarefa: t.id_tarefa,
        id_usuario: t.id_usuario,
        descricao: t.descricao,
        equipe: t.equipe,
        prioridade: t.prioridade,
        status: t.status,
        isCompartilhada: t.isCompartilhada,
        shareToken: t.shareToken,
        data_cadastro: t.data_cadastro,
        nome: t.usuario?.nome || 'Não atribuído',
        email: t.usuario?.email || '',
        totalComentarios: t._count.comentarios,
        totalCompartilhamentos: t._count.compartilhamentos,
        isOwner,
        isSharedWithMe,
      };
    });
  }

  async findOne(id: number, currentUser?: { id_usuario: number; email: string; role: string }) {
    const task = await this.prisma.tarefa.findUnique({
      where: { id_tarefa: id },
      include: {
        usuario: {
          select: {
            id_usuario: true,
            nome: true,
            email: true,
          },
        },
        compartilhamentos: true,
        comentarios: {
          include: {
            usuario: {
              select: { id_usuario: true, nome: true, email: true, role: true },
            },
          },
          orderBy: { data_criacao: 'asc' },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Tarefa #${id} não encontrada.`);
    }

    // Checagem de permissão de visualização
    if (currentUser) {
      const isPrivileged = currentUser.role === 'ADMIN' || currentUser.role === 'ROOT';
      const isOwner = task.id_usuario === currentUser.id_usuario;
      const isSharedWithMe =
        task.isCompartilhada ||
        task.compartilhamentos.some(
          (c) => c.id_usuario === currentUser.id_usuario || c.email === currentUser.email,
        );

      if (!isPrivileged && !isOwner && !isSharedWithMe) {
        throw new ForbiddenException('Você não tem permissão para visualizar esta tarefa privada.');
      }
    }

    return {
      id_tarefa: task.id_tarefa,
      id_usuario: task.id_usuario,
      descricao: task.descricao,
      equipe: task.equipe,
      prioridade: task.prioridade,
      status: task.status,
      isCompartilhada: task.isCompartilhada,
      shareToken: task.shareToken,
      data_cadastro: task.data_cadastro,
      nome: task.usuario?.nome || 'Não atribuído',
      email: task.usuario?.email || '',
      comentarios: task.comentarios,
      compartilhamentos: task.compartilhamentos,
    };
  }

  async update(id: number, updateTaskDto: UpdateTaskDto, currentUser?: { id_usuario: number; role: string }) {
    const task = await this.findOne(id);

    if (currentUser) {
      const isPrivileged = currentUser.role === 'ADMIN' || currentUser.role === 'ROOT';
      const isOwner = task.id_usuario === currentUser.id_usuario;
      if (!isPrivileged && !isOwner) {
        throw new ForbiddenException('Apenas o criador ou administradores podem editar esta tarefa.');
      }
    }

    if (updateTaskDto.id_usuario) {
      const userExists = await this.prisma.user.findUnique({
        where: { id_usuario: updateTaskDto.id_usuario },
      });
      if (!userExists) {
        throw new BadRequestException(`Usuário #${updateTaskDto.id_usuario} não existe.`);
      }
    }

    const data: any = { ...updateTaskDto };
    if (data.prioridade) {
      data.prioridade = data.prioridade.toLowerCase();
    }

    const updated = await this.prisma.tarefa.update({
      where: { id_tarefa: id },
      data,
      include: {
        usuario: {
          select: {
            id_usuario: true,
            nome: true,
            email: true,
          },
        },
      },
    });

    return {
      id_tarefa: updated.id_tarefa,
      id_usuario: updated.id_usuario,
      descricao: updated.descricao,
      equipe: updated.equipe,
      prioridade: updated.prioridade,
      status: updated.status,
      isCompartilhada: updated.isCompartilhada,
      shareToken: updated.shareToken,
      data_cadastro: updated.data_cadastro,
      nome: updated.usuario?.nome || 'Não atribuído',
    };
  }

  async updateStatus(id: number, rawStatus: string) {
    await this.findOne(id);

    let status = rawStatus;
    const s = rawStatus.toLowerCase().trim();
    if (s.includes('não') || s.includes('nao')) {
      status = 'Não Iniciado';
    } else if (s.includes('desenvolvimento') || s.includes('progresso')) {
      status = 'Em Desenvolvimento';
    } else if (s.includes('final') || s.includes('conclu')) {
      status = 'Finalizado';
    }

    return this.prisma.tarefa.update({
      where: { id_tarefa: id },
      data: { status },
    });
  }

  async remove(id: number, currentUser?: { id_usuario: number; role: string }) {
    const task = await this.findOne(id);

    if (currentUser) {
      const isPrivileged = currentUser.role === 'ADMIN' || currentUser.role === 'ROOT';
      const isOwner = task.id_usuario === currentUser.id_usuario;
      if (!isPrivileged && !isOwner) {
        throw new ForbiddenException('Apenas o criador ou administradores podem excluir esta tarefa.');
      }
    }

    return this.prisma.tarefa.delete({
      where: { id_tarefa: id },
    });
  }

  // --- Compartilhamento de Tarefas ---

  async shareTask(id: number, shareTaskDto: ShareTaskDto, currentUser: { id_usuario: number; nome: string; role: string }) {
    const task = await this.findOne(id);

    const isPrivileged = currentUser.role === 'ADMIN' || currentUser.role === 'ROOT';
    const isOwner = task.id_usuario === currentUser.id_usuario;
    if (!isPrivileged && !isOwner) {
      throw new ForbiddenException('Apenas o proprietário da tarefa ou administradores podem compartilhá-la.');
    }

    const shareToken = task.shareToken || crypto.randomBytes(16).toString('hex');

    // Atualiza a tarefa como compartilhada
    await this.prisma.tarefa.update({
      where: { id_tarefa: id },
      data: {
        isCompartilhada: true,
        shareToken,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
    const shareUrl = `${frontendUrl}/tarefas/compartilhada/${shareToken}`;

    // Adiciona e-mails na lista de compartilhamento
    if (shareTaskDto.emails && shareTaskDto.emails.length > 0) {
      for (const rawEmail of shareTaskDto.emails) {
        const email = rawEmail.trim().toLowerCase();
        const existingUser = await this.prisma.user.findUnique({ where: { email } });

        const alreadyShared = await this.prisma.tarefaCompartilhada.findFirst({
          where: {
            id_tarefa: id,
            email,
          },
        });

        if (!alreadyShared) {
          await this.prisma.tarefaCompartilhada.create({
            data: {
              id_tarefa: id,
              email,
              id_usuario: existingUser ? existingUser.id_usuario : null,
            },
          });
        }

        // Envia notificação por e-mail se SMTP estiver configurado
        const smtpHost = process.env.SMTP_HOST;
        if (smtpHost) {
          try {
            const transporter = nodemailer.createTransport({
              host: smtpHost,
              port: Number(process.env.SMTP_PORT) || 587,
              secure: Number(process.env.SMTP_PORT) === 465,
              auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
              },
              tls: { rejectUnauthorized: false },
            });

            const info = await transporter.sendMail({
              from: process.env.SMTP_FROM || 'no-reply@senai.com',
              to: email,
              subject: `Tarefa Compartilhada com Você: "${task.descricao.substring(0, 30)}..."`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                  <h3 style="color: #2563eb;">SENAI Tasks — Tarefa Compartilhada</h3>
                  <p>Olá!</p>
                  <p><strong>${currentUser.nome}</strong> compartilhou uma tarefa com você:</p>
                  <blockquote style="background: #f8fafc; padding: 12px; border-left: 4px solid #2563eb; margin: 16px 0;">
                    ${task.descricao}
                  </blockquote>
                  <p>Clique abaixo para acessar a tarefa, visualizar os detalhes e interagir no chat:</p>
                  <a href="${shareUrl}" style="background: #2563eb; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Acessar Tarefa
                  </a>
                </div>
              `,
            });
            console.log(`[Share Email] ✅ E-mail de compartilhamento enviado para ${email}: MessageID ${info.messageId}`);
          } catch (e: any) {
            console.error('[Share Email Error]:', e.message);
          }
        }
      }
    }

    console.log(`[Tarefa Compartilhada #${id}] Link: ${shareUrl}`);

    return {
      message: 'Tarefa compartilhada com sucesso!',
      shareUrl,
      shareToken,
    };
  }

  async unshareTask(id: number, currentUser: { id_usuario: number; role: string }) {
    const task = await this.findOne(id);
    const isOwner = Number(task.id_usuario) === Number(currentUser.id_usuario);

    if (!isOwner) {
      throw new ForbiddenException('Apenas o responsável pela tarefa pode retirar o compartilhamento.');
    }

    await this.prisma.tarefa.update({
      where: { id_tarefa: id },
      data: { isCompartilhada: false },
    });

    await this.prisma.tarefaCompartilhada.deleteMany({
      where: { id_tarefa: id },
    });

    return { message: 'Compartilhamento revogado. A tarefa voltou a ser privada.' };
  }

  async findByShareToken(shareToken: string, currentUser?: { id_usuario: number; email: string }) {
    const task = await this.prisma.tarefa.findUnique({
      where: { shareToken },
      include: {
        usuario: {
          select: { id_usuario: true, nome: true, email: true },
        },
        comentarios: {
          include: {
            usuario: {
              select: { id_usuario: true, nome: true, email: true, role: true },
            },
          },
          orderBy: { data_criacao: 'asc' },
        },
      },
    });

    if (!task || !task.isCompartilhada) {
      throw new NotFoundException('Esta tarefa não está compartilhada ou o link é inválido.');
    }

    // Se o usuário logado acessou o link compartilhado, registra a permissão dele na tarefa!
    if (currentUser && currentUser.id_usuario !== task.id_usuario) {
      const alreadyShared = await this.prisma.tarefaCompartilhada.findFirst({
        where: {
          id_tarefa: task.id_tarefa,
          OR: [
            { id_usuario: currentUser.id_usuario },
            { email: currentUser.email.toLowerCase() },
          ],
        },
      });

      if (!alreadyShared) {
        await this.prisma.tarefaCompartilhada.create({
          data: {
            id_tarefa: task.id_tarefa,
            id_usuario: currentUser.id_usuario,
            email: currentUser.email.toLowerCase(),
          },
        });
        console.log(`[Share Link] ✅ Usuário ${currentUser.email} vinculado automaticamente à tarefa #${task.id_tarefa}`);
      }
    }

    return {
      id_tarefa: task.id_tarefa,
      id_usuario: task.id_usuario,
      descricao: task.descricao,
      equipe: task.equipe,
      prioridade: task.prioridade,
      status: task.status,
      isCompartilhada: task.isCompartilhada,
      shareToken: task.shareToken,
      data_cadastro: task.data_cadastro,
      nome: task.usuario?.nome || 'Não atribuído',
      email: task.usuario?.email || '',
      comentarios: task.comentarios,
    };
  }

  // --- Feed / Comentários / Anexos ---

  async getComments(taskId: number) {
    await this.findOne(taskId);

    return this.prisma.tarefaComentario.findMany({
      where: { id_tarefa: taskId },
      include: {
        usuario: {
          select: { id_usuario: true, nome: true, email: true, role: true },
        },
      },
      orderBy: { data_criacao: 'asc' },
    });
  }

  async addComment(
    taskId: number,
    userId: number,
    dto: CreateCommentDto,
    file?: Express.Multer.File,
  ) {
    await this.findOne(taskId);

    let arquivo_url: string | null = null;
    let arquivo_nome: string | null = null;
    let tipo = dto.tipo || 'TEXT';

    if (file) {
      arquivo_url = `/uploads/${file.filename}`;
      arquivo_nome = file.originalname;

      if (file.mimetype.startsWith('image/')) {
        tipo = 'IMAGE';
      } else {
        tipo = 'FILE';
      }
    }

    const comment = await this.prisma.tarefaComentario.create({
      data: {
        id_tarefa: taskId,
        id_usuario: userId,
        conteudo: dto.conteudo,
        tipo,
        arquivo_url,
        arquivo_nome,
      },
      include: {
        usuario: {
          select: { id_usuario: true, nome: true, email: true, role: true },
        },
      },
    });

    return comment;
  }

  async updateComment(commentId: number, userId: number, dto: UpdateCommentDto) {
    const comment = await this.prisma.tarefaComentario.findUnique({
      where: { id_comentario: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comentário não encontrado.');
    }

    if (comment.id_usuario !== userId) {
      throw new ForbiddenException('Apenas o autor pode editar este comentário.');
    }

    return this.prisma.tarefaComentario.update({
      where: { id_comentario: commentId },
      data: { conteudo: dto.conteudo },
      include: {
        usuario: {
          select: { id_usuario: true, nome: true, email: true, role: true },
        },
      },
    });
  }

  async deleteComment(commentId: number, userId: number, userRole: string) {
    const comment = await this.prisma.tarefaComentario.findUnique({
      where: { id_comentario: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comentário não encontrado.');
    }

    const isAuthor = comment.id_usuario === userId;
    const isPrivileged = userRole === 'ROOT' || userRole === 'ADMIN';

    if (!isAuthor && !isPrivileged) {
      throw new ForbiddenException('Você não tem permissão para excluir este comentário.');
    }

    await this.prisma.tarefaComentario.delete({
      where: { id_comentario: commentId },
    });

    return { message: 'Comentário excluído com sucesso.' };
  }
}
