import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const email = createUserDto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new BadRequestException('E-mail já cadastrado no sistema.');
    }

    const salt = await bcrypt.genSalt(10);
    const senha = createUserDto.senha || '123456';
    const senhaHash = await bcrypt.hash(senha, salt);

    const user = await this.prisma.user.create({
      data: {
        nome: createUserDto.nome,
        email,
        telefone: createUserDto.telefone ? createUserDto.telefone.replace(/\D/g, '') : null,
        senha: senhaHash,
        role: 'USER',
        ativo: true, // Criado via painel de administração já nasce ativo
      },
      select: {
        id_usuario: true,
        nome: true,
        email: true,
        telefone: true,
        role: true,
        ativo: true,
        data_criacao: true,
      },
    });

    return user;
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      select: {
        id_usuario: true,
        nome: true,
        email: true,
        telefone: true,
        role: true,
        ativo: true,
        data_criacao: true,
        _count: {
          select: { tarefas: true },
        },
      },
      orderBy: { id_usuario: 'asc' },
    });

    return users;
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id_usuario: id },
      select: {
        id_usuario: true,
        nome: true,
        email: true,
        role: true,
        ativo: true,
        data_criacao: true,
        tarefas: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuário #${id} não encontrado.`);
    }

    return user;
  }

  async toggleStatus(id: number) {
    const user = await this.findOne(id);
    if (user.role === 'ROOT') {
      throw new ForbiddenException('Não é permitido desativar o usuário ROOT.');
    }

    return this.prisma.user.update({
      where: { id_usuario: id },
      data: { ativo: !user.ativo },
      select: {
        id_usuario: true,
        nome: true,
        email: true,
        role: true,
        ativo: true,
      },
    });
  }

  async updateRole(id: number, newRole: string, requesterId: number) {
    const user = await this.findOne(id);

    if (user.role === 'ROOT') {
      throw new ForbiddenException('A role do usuário ROOT não pode ser alterada.');
    }

    if (!['ADMIN', 'USER'].includes(newRole.toUpperCase())) {
      throw new BadRequestException('Role inválida. Escolha ADMIN ou USER.');
    }

    return this.prisma.user.update({
      where: { id_usuario: id },
      data: { role: newRole.toUpperCase() },
      select: {
        id_usuario: true,
        nome: true,
        email: true,
        role: true,
        ativo: true,
      },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    await this.findOne(id);

    const dataToUpdate: any = {};

    if (updateUserDto.nome !== undefined) {
      if (!updateUserDto.nome.trim()) {
        throw new BadRequestException('O nome não pode ser vazio.');
      }
      dataToUpdate.nome = updateUserDto.nome.trim();
    }

    if (updateUserDto.telefone !== undefined) {
      dataToUpdate.telefone = updateUserDto.telefone ? updateUserDto.telefone.replace(/\D/g, '') : null;
    }

    if (updateUserDto.senha) {
      const salt = await bcrypt.genSalt(10);
      dataToUpdate.senha = await bcrypt.hash(updateUserDto.senha, salt);
    }

    return this.prisma.user.update({
      where: { id_usuario: id },
      data: dataToUpdate,
      select: {
        id_usuario: true,
        nome: true,
        email: true,
        telefone: true,
        role: true,
        ativo: true,
        data_criacao: true,
      },
    });
  }

  async remove(id: number) {
    const user = await this.findOne(id);
    if (user.role === 'ROOT') {
      throw new ForbiddenException('O usuário ROOT do sistema não pode ser removido.');
    }

    return this.prisma.user.delete({
      where: { id_usuario: id },
    });
  }
}

