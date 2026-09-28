import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: registerDto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException('Este e-mail já está cadastrado.');
    }

    const totalUsers = await this.prisma.user.count();
    // Primeiro usuário do sistema torna-se ROOT automaticamente
    const isFirstUser = totalUsers === 0;

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(registerDto.senha, salt);

    const user = await this.prisma.user.create({
      data: {
        nome: registerDto.nome,
        email: registerDto.email.toLowerCase().trim(),
        senha: senhaHash,
        role: isFirstUser ? 'ROOT' : 'USER',
        ativo: isFirstUser ? true : false, // Requer aprovação se não for root
      },
      select: {
        id_usuario: true,
        nome: true,
        email: true,
        role: true,
        ativo: true,
        data_criacao: true,
      },
    });

    return {
      user,
      message: isFirstUser
        ? 'Conta ROOT criada e ativada com sucesso!'
        : 'Cadastro realizado com sucesso! Aguarde a aprovação do seu acesso por um administrador.',
    };
  }

  async login(loginDto: LoginDto) {
    const email = loginDto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('E-mail ou senha incorretos.');
    }

    const isMatch = await bcrypt.compare(loginDto.senha, user.senha);
    if (!isMatch) {
      throw new UnauthorizedException('E-mail ou senha incorretos.');
    }

    if (!user.ativo) {
      throw new UnauthorizedException(
        'Sua conta ainda não foi ativada. Aguarde a aprovação de um administrador.'
      );
    }

    const payload = {
      sub: user.id_usuario,
      email: user.email,
      role: user.role,
      ativo: user.ativo,
    };
    const access_token = this.jwtService.sign(payload);

    return {
      user: {
        id_usuario: user.id_usuario,
        nome: user.nome,
        email: user.email,
        role: user.role,
        ativo: user.ativo,
        data_criacao: user.data_criacao,
      },
      access_token,
      message: 'Login realizado com sucesso!',
    };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id_usuario: userId },
      select: {
        id_usuario: true,
        nome: true,
        email: true,
        role: true,
        ativo: true,
        data_criacao: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado.');
    }

    return user;
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const cleanEmail = forgotPasswordDto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (user) {
      // Invalida tokens anteriores
      await this.prisma.passwordResetToken.updateMany({
        where: { email: user.email, used: false },
        data: { used: true },
      });

      // Gera token único
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora de validade

      await this.prisma.passwordResetToken.create({
        data: {
          email: user.email,
          token,
          expiresAt,
        },
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
      const resetLink = `${frontendUrl}/reset-password?token=${token}`;

      console.log('\n======================================================');
      console.log('🔑 [SOLICITAÇÃO DE RECUPERAÇÃO DE SENHA]');
      console.log(`Para: ${user.nome} (${user.email})`);
      console.log(`Link de Redefinição: ${resetLink}`);
      console.log('Validade: 1 hora');
      console.log('======================================================\n');

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
            tls: {
              rejectUnauthorized: false,
            },
          });

          const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@senai.com',
            to: user.email,
            subject: 'SENAI Tasks — Redefinição de Senha',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 20px; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #2563eb; margin-bottom: 8px;">SENAI Tasks</h2>
                <p>Olá, <strong>${user.nome}</strong>!</p>
                <p>Recebemos uma solicitação para redefinir a senha da sua conta de acesso ao <strong>SENAI Tasks</strong>.</p>
                <p>Clique no botão abaixo para escolher uma nova senha segura. Este link é válido por <strong>1 hora</strong>.</p>
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${resetLink}"
                     style="background: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                    Redefinir Minha Senha
                  </a>
                </div>
                <p style="color: #64748b; font-size: 13px;">Se você não solicitou a redefinição de senha, nenhuma ação é necessária. Sua senha atual permanecerá segura.</p>
              </div>
            `,
          });

          console.log(`[SMTP] ✅ E-mail de redefinição enviado com sucesso para ${user.email}! MessageID: ${info.messageId}`);
        } catch (err: any) {
          console.error('[SMTP] ❌ Falha no envio do e-mail:', err.message);
        }
      }
    }

    return {
      message: 'Se este e-mail estiver cadastrado em nosso sistema, você receberá o link de redefinição em instantes.',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, newPassword } = resetPasswordDto;

    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      throw new BadRequestException('Link de redefinição inválido ou não encontrado.');
    }

    if (resetToken.used) {
      throw new BadRequestException('Este link de redefinição já foi utilizado anteriormente.');
    }

    if (new Date() > resetToken.expiresAt) {
      throw new BadRequestException('Este link de redefinição expirou. Solicite um novo link.');
    }

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(newPassword, salt);

    await this.prisma.user.update({
      where: { email: resetToken.email },
      data: { senha: senhaHash },
    });

    await this.prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    });

    return {
      message: 'Senha alterada com sucesso! Você já pode fazer login com suas novas credenciais.',
    };
  }
}
