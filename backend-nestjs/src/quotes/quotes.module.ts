import { Module } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { QuotesController } from './quotes.controller';
import { RecommendationsService } from './recommendations.service';

@Module({
  providers: [QuotesService, RecommendationsService],
  controllers: [QuotesController],
})
export class QuotesModule {}
