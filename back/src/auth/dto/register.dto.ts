import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Mariana Silva', description: 'Nome completo do usuário' })
  @IsString({ message: 'O nome deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  nome: string;

  @ApiProperty({ example: 'mariana@senai.com', description: 'E-mail do usuário' })
  @IsEmail({}, { message: 'Por favor, insira um e-mail válido.' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório.' })
  email: string;

  @ApiProperty({ example: '12345678', description: 'Senha de acesso (mínimo 8 caracteres)' })
  @IsString()
  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
  senha: string;

  @ApiProperty({ example: '5519999486552', description: 'Telefone / WhatsApp com DDD (Opcional)', required: false })
  @IsString()
  telefone?: string;
}

