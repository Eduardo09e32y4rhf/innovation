import { IsIn, IsObject, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export const REQUEST_TYPES = ['TROCA_FOLGA', 'TROCA_TURNO', 'NOVA_ESCALA', 'AJUSTE_BATIDA', 'JUSTIFICATIVA', 'FOLGA_COMPENSACAO'] as const;

export class CreateRequestDto {
  @IsIn(REQUEST_TYPES as unknown as string[])
  type!: (typeof REQUEST_TYPES)[number];

  @IsObject()
  payload!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsUUID()
  peerEmployeeId?: string;
}

export class DecideRequestDto {
  @IsIn(['APPROVE', 'REJECT'])
  action!: 'APPROVE' | 'REJECT';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class PeerResponseDto {
  @IsIn(['ACCEPT', 'DECLINE'])
  action!: 'ACCEPT' | 'DECLINE';

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class BulkDecideDto {
  @IsUUID('all', { each: true })
  ids!: string[];

  @IsIn(['APPROVE', 'REJECT'])
  action!: 'APPROVE' | 'REJECT';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
