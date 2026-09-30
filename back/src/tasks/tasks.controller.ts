import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { ShareTaskDto } from './dto/share-task.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

// Configuração do Multer Storage para upload de imagens e arquivos
const storage = diskStorage({
  destination: (req, file, cb) => {
    cb(null, join(process.cwd(), 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
  },
});

@ApiTags('Tarefas')
@Controller()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // --- Rotas REST Padrão (/tasks) ---

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('tasks')
  @ApiOperation({ summary: 'Criar uma nova tarefa (privada por padrão do usuário logado)' })
  @ApiResponse({ status: 201, description: 'Tarefa criada com sucesso.' })
  async create(@Body() createTaskDto: CreateTaskDto, @Request() req: any) {
    const userId = req.user?.id_usuario;
    return this.tasksService.create(createTaskDto, userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('tasks')
  @ApiOperation({ summary: 'Listar tarefas (privadas do usuário logado + compartilhadas com ele)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'prioridade', required: false })
  @ApiQuery({ name: 'equipe', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'onlyMine', required: false })
  async findAll(@Query() query: any, @Request() req: any) {
    return this.tasksService.findAll(query, req.user);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('tasks/shared/:shareToken')
  @ApiOperation({ summary: 'Acessar detalhes da tarefa compartilhada através do link/token e vincular usuário' })
  async findByShareToken(@Param('shareToken') shareToken: string, @Request() req: any) {
    return this.tasksService.findByShareToken(shareToken, req.user);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('tasks/:id')
  @ApiOperation({ summary: 'Buscar detalhes de uma tarefa' })
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.tasksService.findOne(id, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put('tasks/order/personal')
  @ApiOperation({ summary: 'Atualizar sequência pessoal de tarefas do usuário' })
  async updatePersonalOrder(@Body() body: { items: { id_tarefa: number; posicao: number }[] }, @Request() req: any) {
    return this.tasksService.updatePersonalOrder(body.items || [], req.user.id_usuario);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put('tasks/order/global')
  @ApiOperation({ summary: 'Atualizar sequência global de tarefas da equipe' })
  async updateGlobalOrder(@Body() body: { items: { id_tarefa: number; ordem: number }[] }, @Request() req: any) {
    return this.tasksService.updateGlobalOrder(body.items || [], req.user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put('tasks/:id')
  @ApiOperation({ summary: 'Atualizar dados de uma tarefa' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTaskDto: UpdateTaskDto,
    @Request() req: any,
  ) {
    return this.tasksService.update(id, updateTaskDto, req.user);
  }

  @Patch('tasks/:id/status')
  @ApiOperation({ summary: 'Atualizar o status da tarefa no Kanban' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    return this.tasksService.updateStatus(id, updateStatusDto.status);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('tasks/:id')
  @ApiOperation({ summary: 'Excluir uma tarefa' })
  async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.tasksService.remove(id, req.user);
  }

  // --- Compartilhamento de Tarefas ---

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('tasks/:id/share')
  @ApiOperation({ summary: 'Compartilhar tarefa gerando link e opcionalmente enviando por e-mail' })
  async shareTask(
    @Param('id', ParseIntPipe) id: number,
    @Body() shareTaskDto: ShareTaskDto,
    @Request() req: any,
  ) {
    return this.tasksService.shareTask(id, shareTaskDto, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('tasks/:id/share')
  @ApiOperation({ summary: 'Revogar compartilhamento tornando a tarefa privada novamente' })
  async unshareTask(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.tasksService.unshareTask(id, req.user);
  }

  // --- Feed de Interação / Comentários / Anexos ---

  @Get('tasks/:id/comments')
  @ApiOperation({ summary: 'Listar todos os comentários e anexos do feed da tarefa' })
  async getComments(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.getComments(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('tasks/:id/comments')
  @UseInterceptors(FileInterceptor('file', { storage, limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiOperation({ summary: 'Adicionar comentário, imagem ou arquivo no feed da tarefa' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        conteudo: { type: 'string' },
        tipo: { type: 'string' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  async addComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCommentDto,
    @Request() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.tasksService.addComment(id, req.user.id_usuario, dto, file);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put('tasks/comments/:commentId')
  @ApiOperation({ summary: 'Editar comentário (apenas autor)' })
  async updateComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() dto: UpdateCommentDto,
    @Request() req: any,
  ) {
    return this.tasksService.updateComment(commentId, req.user.id_usuario, dto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('tasks/comments/:commentId')
  @ApiOperation({ summary: 'Excluir comentário (apenas autor ou admin)' })
  async deleteComment(
    @Param('commentId', ParseIntPipe) commentId: number,
    @Request() req: any,
  ) {
    return this.tasksService.deleteComment(commentId, req.user.id_usuario, req.user.role);
  }

  // --- Rotas de compatibilidade com o projeto original (Legado) ---

  @Post('novaTarefa')
  @ApiOperation({ summary: '[Legado] Cadastrar nova tarefa' })
  async legacyNovaTarefa(@Body() createTaskDto: CreateTaskDto) {
    const result = await this.tasksService.create(createTaskDto);
    return { result };
  }

  @Get('listarTarefas')
  @ApiOperation({ summary: '[Legado] Listar todas as tarefas' })
  async legacyListarTarefas() {
    const tarefas = await this.tasksService.findAll();
    return { tarefas };
  }

  @Get('listarTarefa/:id')
  @ApiOperation({ summary: '[Legado] Obter detalhes da tarefa para edição' })
  async legacyListarTarefa(@Param('id', ParseIntPipe) id: number) {
    const tarefa = await this.tasksService.findOne(id);
    return { tarefa: [tarefa] };
  }

  @Put('atualizarTarefa/:id')
  @ApiOperation({ summary: '[Legado] Atualizar tarefa existente' })
  async legacyAtualizarTarefa(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    const result = await this.tasksService.update(id, updateTaskDto);
    return { result };
  }

  @Put('atualizarStatus/:id')
  @ApiOperation({ summary: '[Legado] Atualizar status da tarefa' })
  async legacyAtualizarStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    const tarefas = await this.tasksService.updateStatus(id, updateStatusDto.status);
    return { tarefas };
  }

  @Delete('deletarTarefa/:id')
  @ApiOperation({ summary: '[Legado] Deletar tarefa' })
  async legacyDeletarTarefa(@Param('id', ParseIntPipe) id: number) {
    const tarefas = await this.tasksService.remove(id);
    return { tarefas };
  }
}
