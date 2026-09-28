import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { NlpService } from '../nlp/nlp.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQuery } from './dto/list-orders.query';
import { OrderDecisionDto } from './dto/order-decision.dto';
import { StructureOrderDto } from '../nlp/dto/structure-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';

@Controller('api/v1/orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly nlpService: NlpService,
  ) {}

  /** Público: transforma texto libre en atributos estructurados (NestJS -> FastAPI). */
  @Post('nlp-structure')
  structure(@Body() dto: StructureOrderDto) {
    return this.nlpService.structureOrder(dto.rawText, dto.domain);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user.userId, dto);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT')
  findMine(@CurrentUser() user: AuthUser) {
    return this.ordersService.findByClient(user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('BAKER', 'ADMIN')
  findAll(@Query() query: ListOrdersQuery) {
    return this.ordersService.findAll(query.status);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ordersService.findOneForUser(id, user);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT')
  decide(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: OrderDecisionDto,
  ) {
    return this.ordersService.decide(id, user.userId, dto.status);
  }
}
