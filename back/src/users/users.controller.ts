import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';

@ApiTags('Usuários')
@ApiBearerAuth()
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ROOT')
  @Post('usuarios')
  @ApiOperation({ summary: 'Cadastrar um novo usuário (Apenas Admin/Root)' })
  @ApiResponse({ status: 201, description: 'Usuário cadastrado com sucesso.' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ROOT')
  @Get('usuarios')
  @ApiOperation({ summary: 'Listar todos os usuários (Apenas Admin/Root)' })
  @ApiResponse({ status: 200, description: 'Lista de usuários.' })
  async findAll() {
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ROOT')
  @Get('usuarios/:id')
  @ApiOperation({ summary: 'Buscar usuário por ID (Apenas Admin/Root)' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ROOT')
  @Patch('usuarios/:id/status')
  @ApiOperation({ summary: 'Ativar ou desativar usuário (Apenas Admin/Root)' })
  async toggleStatus(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.toggleStatus(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ROOT')
  @Patch('usuarios/:id/role')
  @ApiOperation({ summary: 'Promover ou rebaixar cargo do usuário (Exclusivo ROOT)' })
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body('role') role: string,
    @Request() req: any,
  ) {
    return this.usersService.updateRole(id, role, req.user.id_usuario);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'ROOT')
  @Delete('usuarios/:id')
  @ApiOperation({ summary: 'Remover usuário por ID (Apenas Admin/Root)' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }

  // --- Rotas de compatibilidade com o projeto original da prova ---
  @Get('listarUsuarios')
  @ApiOperation({ summary: '[Legado] Listar usuários' })
  async legacyListarUsuarios() {
    const users = await this.usersService.findAll();
    return { users };
  }

  @Post('novoUsuario')
  @ApiOperation({ summary: '[Legado] Cadastrar usuário' })
  async legacyNovoUsuario(@Body() createUserDto: CreateUserDto) {
    const result = await this.usersService.create(createUserDto);
    return { result };
  }
}
