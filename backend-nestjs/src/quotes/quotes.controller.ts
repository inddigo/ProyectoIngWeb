import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { RecommendationsService } from './recommendations.service';
import {
  ProfessionalProfileDto,
  RecommendationDto,
} from './dto/recommendation.dto';
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
  constructor(
    private readonly quotesService: QuotesService,
    private readonly recommendations: RecommendationsService,
  ) {}

  @Get('profile')
  @Roles('BAKER')
  profile(@CurrentUser() user: AuthUser) {
    return this.recommendations.profile(user.userId);
  }

  @Put('profile')
  @Roles('BAKER')
  saveProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: ProfessionalProfileDto,
  ) {
    return this.recommendations.saveProfile(user.userId, dto);
  }

  @Delete('history')
  @Roles('BAKER')
  clearHistory(@CurrentUser() user: AuthUser) {
    return this.recommendations.clearHistory(user.userId);
  }

  @Post('recommend/:orderId')
  @Roles('BAKER')
  recommend(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: RecommendationDto,
  ) {
    return this.recommendations.calculate(orderId, user.userId, dto);
  }

  @Get('calculate/:orderId')
  @Roles('BAKER')
  calculate(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.quotesService.calculateEstimate(orderId);
  }

  @Post()
  @Roles('BAKER')
  createQuote(@Body() dto: CreateQuoteDto, @CurrentUser() user: AuthUser) {
    return this.quotesService.createQuote(dto, user);
  }

  @Get('order/:orderId')
  getQuote(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.quotesService.getQuoteByOrderId(orderId, user);
  }
}
