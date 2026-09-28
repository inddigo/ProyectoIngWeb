import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';

@Controller('api/v1/quotes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get('calculate/:orderId')
  @Roles('BAKER')
  calculate(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.quotesService.calculateEstimate(orderId);
  }

  @Post()
  @Roles('BAKER')
  createQuote(@Body() dto: CreateQuoteDto) {
    return this.quotesService.createQuote(dto);
  }

  @Get('order/:orderId')
  getQuote(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.quotesService.getQuoteByOrderId(orderId, user);
  }
}
