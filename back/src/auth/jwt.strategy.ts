import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'segredo_super_seguro_jwt_senai_saep_2024',
    });
  }

  async validate(payload: { sub: number; email: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id_usuario: payload.sub },
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
      throw new UnauthorizedException('Usuário não encontrado ou token inválido.');
    }

    if (!user.ativo) {
      throw new UnauthorizedException('Sua conta aguarda aprovação de um administrador.');
    }

    return user;
  }
}
