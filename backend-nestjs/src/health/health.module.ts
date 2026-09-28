import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { NlpModule } from '../nlp/nlp.module';

@Module({
  imports: [NlpModule],
  controllers: [HealthController],
})
export class HealthModule {}
