import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateTaskDto {
  @ApiPropertyOptional({ example: 1, description: 'ID do usuário responsável' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'O ID do usuário deve ser um número.' })
  id_usuario?: number;

  @ApiPropertyOptional({ example: 'Atualizar documentação da API', description: 'Descrição da tarefa' })
  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto.' })
  descricao?: string;

  @ApiPropertyOptional({ example: 'Backend', description: 'Nome da equipe' })
  @IsOptional()
  @IsString({ message: 'A equipe deve ser um texto.' })
  equipe?: string;

  @ApiPropertyOptional({ example: 'média', description: 'Prioridade da tarefa' })
  @IsOptional()
  @IsString({ message: 'A prioridade deve ser um texto.' })
  prioridade?: string;

  @ApiPropertyOptional({ example: 'Em Desenvolvimento', description: 'Status atual' })
  @IsOptional()
  @IsString()
  status?: string;
}
