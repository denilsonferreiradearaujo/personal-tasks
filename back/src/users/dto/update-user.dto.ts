import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Mariana Silva', description: 'Nome completo do usuário' })
  @IsOptional()
  @IsString({ message: 'O nome deve ser um texto.' })
  nome?: string;

  @ApiPropertyOptional({ example: '5519999486552', description: 'Telefone / WhatsApp com DDD' })
  @IsOptional()
  @IsString()
  telefone?: string;

  @ApiPropertyOptional({ example: 'novaSenha123', description: 'Nova senha de acesso (mínimo 8 caracteres)' })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'A nova senha deve possuir pelo menos 8 caracteres.' })
  senha?: string;
}
