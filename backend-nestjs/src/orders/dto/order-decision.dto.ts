import { IsIn } from 'class-validator';

export const CLIENT_DECISIONS = [
  'ACCEPTED_BY_CLIENT',
  'REJECTED_BY_CLIENT',
] as const;
export type ClientDecision = (typeof CLIENT_DECISIONS)[number];

export class OrderDecisionDto {
  @IsIn(CLIENT_DECISIONS)
  status: ClientDecision;
}
