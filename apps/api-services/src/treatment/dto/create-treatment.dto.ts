import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateTreatmentDto {
  @IsString()
  animalId: string;

  @IsString()
  drugName: string;

  @IsString()
  dosage: string;

  @IsDateString()
  @IsOptional()
  administrationDate?: string;

  @IsNumber()
  withdrawalPeriod: number;

  @IsString()
  @IsOptional()
  veterinarianId?: string;

  @IsString()
  @IsOptional()
  veterinarianName?: string;

  @IsString()
  @IsOptional()
  inventoryId?: string;
}
