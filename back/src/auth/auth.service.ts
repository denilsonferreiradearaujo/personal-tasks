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
import { ResetPasswordOtpDto } from './dto/reset-password-otp.dto';

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
        telefone: registerDto.telefone ? registerDto.telefone.replace(/\D/g, '') : null,
        role: isFirstUser ? 'ROOT' : 'USER',
        ativo: isFirstUser ? true : false, // Requer aprovação se não for root
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
    const { email, phone, method } = forgotPasswordDto;
    const requestedMethod = method?.toLowerCase() || (phone ? 'whatsapp' : 'email');

    // Carregar configurações ativas do sistema
    const settings = await this.prisma.systemSettings.findUnique({
      where: { id: 1 },
    });
    const appTitle = settings?.appTitle || 'Personal Tasks';

    // ==========================================
    // FLUXO WHATSAPP COM OTP (CONCEITO SEP)
    // ==========================================
    if (requestedMethod === 'whatsapp') {
      const rawInput = (phone || email || '').trim();
      let cleanPhone = rawInput.replace(/\D/g, '');
      if (!cleanPhone.startsWith('55') && cleanPhone.length <= 11 && cleanPhone.length > 0) {
        cleanPhone = `55${cleanPhone}`;
      }

      // Buscar usuário por telefone ou variações
      const phoneVariants = [cleanPhone];
      if (cleanPhone.startsWith('55')) {
        phoneVariants.push(cleanPhone.substring(2));
      }

      let user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { telefone: { in: phoneVariants } },
            ...(rawInput.includes('@') ? [{ email: rawInput.toLowerCase() }] : []),
          ],
        },
      });

      // Busca por sufixo de 9 dígitos se não encontrou
      if (!user && cleanPhone.length >= 9) {
        const suffix = cleanPhone.slice(-9);
        user = await this.prisma.user.findFirst({
          where: { telefone: { endsWith: suffix } },
        });
      }

      if (user) {
        const targetPhone = cleanPhone || (user.telefone ? user.telefone.replace(/\D/g, '') : '');
        if (!targetPhone) {
          throw new BadRequestException('Este usuário não possui um número de WhatsApp cadastrado.');
        }
        let finalPhone = targetPhone;
        if (!finalPhone.startsWith('55')) {
          finalPhone = `55${finalPhone}`;
        }

        // Gera código OTP de 5 dígitos (válido por 120 segundos)
        const code = Math.floor(10000 + Math.random() * 90000).toString();
        const expiresAt = new Date(Date.now() + 120 * 1000);

        const textMessage = `Olá, *${user.nome}*!\n\nSeu código de verificação para redefinir a senha no *${appTitle}* é:\n\n*${code}*\n\nEste código expira em *120 segundos*.`;

        const whatsappUrl = settings?.whatsappUrl || process.env.WHATSAPP_URL;
        const whatsappToken = settings?.whatsappToken || process.env.WHATSAPP_TOKEN;

        if (!whatsappUrl) {
          throw new BadRequestException('A URL da Evolution API de WhatsApp não está configurada no sistema.');
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (whatsappToken) {
          headers['apikey'] = whatsappToken;
        }

        let targetUrl = whatsappUrl.trim();
        if (!targetUrl.includes('/message/sendText')) {
          const cleanBase = targetUrl.replace(/\/+$/, '');
          const instance = (settings?.whatsappInstance || 'personal-tasks').trim();
          targetUrl = `${cleanBase}/message/sendText/${instance}`;
        }

        // Monta lista de números para tentar (com fallback inteligente do 9º dígito brasileiro)
        const phonesToTry = [finalPhone];
        if (finalPhone.startsWith('55')) {
          // Se tem 13 dígitos e começa com 9 no 5º caractere, tenta sem o 9 (12 dígitos)
          if (finalPhone.length === 13 && finalPhone[4] === '9') {
            phonesToTry.push(finalPhone.slice(0, 4) + finalPhone.slice(5));
          }
          // Se tem 12 dígitos, tenta com o 9 (13 dígitos)
          else if (finalPhone.length === 12) {
            phonesToTry.push(finalPhone.slice(0, 4) + '9' + finalPhone.slice(4));
          }
        }

        let sendSuccess = false;
        let lastErrorText = '';
        let successfulPhone = finalPhone;

        for (const phoneAttempt of phonesToTry) {
          try {
            console.log(`[WhatsApp] Tentando envio de OTP para ${phoneAttempt}...`);
            const response = await fetch(targetUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                number: phoneAttempt,
                text: textMessage,
              }),
            });

            const resText = await response.text();
            if (response.ok) {
              console.log(`[WhatsApp] ✅ Código OTP enviado com sucesso para ${phoneAttempt}!`);
              sendSuccess = true;
              successfulPhone = phoneAttempt;
              break;
            } else {
              console.warn(`[WhatsApp] ⚠️ Falha no envio para ${phoneAttempt} (HTTP ${response.status}):`, resText);
              lastErrorText = resText;
            }
          } catch (waErr: any) {
            console.error(`[WhatsApp] ❌ Erro de conexão ao enviar para ${phoneAttempt}:`, waErr.message);
            lastErrorText = waErr.message;
          }
        }

        if (!sendSuccess) {
          if (lastErrorText.includes('exists') && lastErrorText.includes('false')) {
            throw new BadRequestException(
              `O WhatsApp informou que o número (${finalPhone}) não possui uma conta ativa no WhatsApp. Verifique se os dígitos e o DDD estão corretos.`,
            );
          }
          throw new BadRequestException(
            `Falha ao disparar mensagem pela Evolution API. Verifique as configurações e a conexão da instância.`,
          );
        }

        // Invalida OTPs anteriores
        const allIdentifiers = [
          finalPhone,
          finalPhone.substring(2),
          successfulPhone,
          successfulPhone.substring(2),
        ];

        await this.prisma.otpToken.updateMany({
          where: {
            identifier: { in: allIdentifiers },
            used: false,
          },
          data: { used: true },
        });

        // Cria o novo OTP para ambos os identificadores para permitir validar de qualquer forma
        await this.prisma.otpToken.create({
          data: {
            identifier: finalPhone,
            code,
            expiresAt,
          },
        });

        if (successfulPhone !== finalPhone) {
          await this.prisma.otpToken.create({
            data: {
              identifier: successfulPhone,
              code,
              expiresAt,
            },
          });
        }

        console.log(`[ForgotPassword] OTP gerado: "${code}" para "${successfulPhone}", expira em 120s`);

        return {
          success: true,
          otpSent: true,
          phone: finalPhone,
          message: 'Código de verificação enviado para o seu WhatsApp!',
        };
      }

      // Mesmo se não encontrar, retorna resposta padronizada por segurança
      return {
        success: true,
        otpSent: true,
        phone: cleanPhone,
        message: 'Se este WhatsApp estiver cadastrado, o código de 5 dígitos foi enviado.',
      };
    }

    // ==========================================
    // FLUXO E-MAIL (SMTP COM LINK)
    // ==========================================
    const cleanEmail = (email || '').trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (user) {
      await this.prisma.passwordResetToken.updateMany({
        where: { email: user.email, used: false },
        data: { used: true },
      });

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await this.prisma.passwordResetToken.create({
        data: {
          email: user.email,
          token,
          expiresAt,
        },
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
      const resetLink = `${frontendUrl}/reset-password?token=${token}`;

      const smtpHost = settings?.smtpHost || process.env.SMTP_HOST;
      const smtpPort = settings?.smtpPort || Number(process.env.SMTP_PORT) || 587;
      const smtpUser = settings?.smtpUser || process.env.SMTP_USER;
      const smtpPass = settings?.smtpPass || process.env.SMTP_PASS;
      const smtpFrom = settings?.smtpFrom || process.env.SMTP_FROM || `"${appTitle}" <${smtpUser}>`;

      if (smtpHost && smtpUser) {
        try {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
              user: smtpUser,
              pass: smtpPass || '',
            },
            tls: {
              rejectUnauthorized: false,
            },
          });

          await transporter.sendMail({
            from: smtpFrom,
            to: user.email,
            subject: `${appTitle} — Redefinição de Senha`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 20px; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #2563eb; margin-bottom: 8px;">${appTitle}</h2>
                <p>Olá, <strong>${user.nome}</strong>!</p>
                <p>Recebemos uma solicitação para redefinir a senha da sua conta no <strong>${appTitle}</strong>.</p>
                <p>Clique no botão abaixo para escolher uma nova senha segura. Este link é válido por <strong>1 hora</strong>.</p>
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${resetLink}"
                     style="background: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                    Redefinir Minha Senha
                  </a>
                </div>
                <p style="color: #64748b; font-size: 13px;">Se você não solicitou a redefinição de senha, nenhuma ação é necessária.</p>
              </div>
            `,
          });
        } catch (err: any) {
          console.error('[SMTP] ❌ Falha no envio do e-mail:', err.message);
        }
      }
    }

    return {
      success: true,
      otpSent: false,
      message: 'Se este e-mail estiver cadastrado, as instruções e o link de recuperação foram enviados com sucesso.',
    };
  }

  async resetPasswordOtp(dto: ResetPasswordOtpDto) {
    const rawPhone = (dto.phone || '').replace(/\D/g, '');
    let cleanPhone = rawPhone;
    if (!cleanPhone.startsWith('55') && cleanPhone.length <= 11) {
      cleanPhone = `55${cleanPhone}`;
    }

    const now = new Date();
    const phoneVariants = [cleanPhone, cleanPhone.substring(2)];
    if (cleanPhone.startsWith('55') && cleanPhone.length === 13 && cleanPhone[4] === '9') {
      const no9 = cleanPhone.slice(0, 4) + cleanPhone.slice(5);
      phoneVariants.push(no9, no9.substring(2));
    } else if (cleanPhone.startsWith('55') && cleanPhone.length === 12) {
      const with9 = cleanPhone.slice(0, 4) + '9' + cleanPhone.slice(4);
      phoneVariants.push(with9, with9.substring(2));
    }

    const otp = await this.prisma.otpToken.findFirst({
      where: {
        identifier: { in: phoneVariants },
        code: dto.code.trim(),
        used: false,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new BadRequestException('Código de verificação inválido ou expirado.');
    }

    let user = await this.prisma.user.findFirst({
      where: { telefone: { in: phoneVariants } },
    });

    if (!user && cleanPhone.length >= 8) {
      const suffix = cleanPhone.slice(-8);
      user = await this.prisma.user.findFirst({
        where: { telefone: { endsWith: suffix } },
      });
    }

    if (!user) {
      throw new NotFoundException('Usuário correspondente ao telefone não encontrado.');
    }

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(dto.newPassword, salt);

    await this.prisma.user.update({
      where: { id_usuario: user.id_usuario },
      data: { senha: senhaHash },
    });

    await this.prisma.otpToken.update({
      where: { id: otp.id },
      data: { used: true },
    });

    return {
      success: true,
      message: 'Sua senha foi redefinida com sucesso! Você já pode fazer login.',
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
