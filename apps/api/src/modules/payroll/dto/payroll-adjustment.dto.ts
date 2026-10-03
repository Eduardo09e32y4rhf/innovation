import { IsString, IsNumber, IsNotEmpty, IsUUID, Min } from 'class-validator';

export class CreatePayrollAdjustmentDto {
  @IsUUID()
  @IsNotEmpty()
  payrollId: string;

  @IsString()
  @IsNotEmpty()
  field: string; // Ex: 'overtime', 'bonus', 'absence'

  @IsNumber()
  @Min(0)
  previousValue: number;

  @IsNumber()
  @Min(0)
  newValue: number;

  @IsString()
  @IsNotEmpty()
  reason: string; // Motivo obrigatório (ex: "Correção de horas extras não computadas")

  @IsUUID()
  @IsNotEmpty()
  responsibleId: string; // Quem fez o ajuste (Auditoria)
}
