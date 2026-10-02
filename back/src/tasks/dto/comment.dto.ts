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

  @ApiProperty({ example: '/uploads/abc.png', description: 'URL do arquivo anexo ou null para remover', required: false })
  @IsOptional()
  arquivo_url?: string | null;

  @ApiProperty({ example: 'foto.png', description: 'Nome do arquivo', required: false })
  @IsOptional()
  arquivo_nome?: string | null;

  @ApiProperty({ example: 'IMAGE', description: 'Tipo do comentário', required: false })
  @IsOptional()
  @IsString()
  tipo?: string;
}
