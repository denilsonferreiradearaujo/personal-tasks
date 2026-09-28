import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEmail, IsOptional } from 'class-validator';

export class ShareTaskDto {
  @ApiProperty({
    example: ['colega@senai.com'],
    description: 'Lista opcional de e-mails para compartilhar diretamente a tarefa',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true, message: 'Cada item deve ser um e-mail válido.' })
  emails?: string[];
}
