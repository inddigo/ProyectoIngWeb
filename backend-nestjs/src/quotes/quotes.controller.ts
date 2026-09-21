import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

// Use AuthGuard('jwt') directly if JwtAuthGuard wrapper is not defined yet
import { AuthGuard } from '@nestjs/passport';

@Controller('api/v1/quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get('calculate/:orderId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('BAKER')
  async calculate(@Param('orderId') orderId: string) {
    return this.quotesService.calculateEstimate(orderId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('BAKER')
  async createQuote(@Body() createQuoteDto: CreateQuoteDto) {
    return this.quotesService.createQuote(createQuoteDto);
  }

  @Get('order/:orderId')
  @UseGuards(AuthGuard('jwt'))
  async getQuote(@Param('orderId') orderId: string) {
    // Both CLIENT and BAKER can view the final quote
    return this.quotesService.getQuoteByOrderId(orderId);
  }
}
