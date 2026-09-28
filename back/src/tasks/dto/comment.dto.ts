import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'Atualizando o status da entrega...', description: 'Conteúdo da mensagem' })
  @IsNotEmpty({ message: 'O conteúdo do comentário é obrigatório.' })
  @IsString()
  conteudo: string;

  @ApiProperty({ example: 'TEXT', description: 'Tipo da mensagem: TEXT, IMAGE ou FILE', required: false })
  @IsOptional()
  @IsString()
  tipo?: string;
}

export class UpdateCommentDto {
  @ApiProperty({ example: 'Correção no texto da mensagem...', description: 'Novo conteúdo da mensagem' })
  @IsNotEmpty({ message: 'O conteúdo não pode ser vazio.' })
  @IsString()
  conteudo: string;
}
