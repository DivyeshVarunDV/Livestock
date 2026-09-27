import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export const PRODUCT_TYPES = ['MILK', 'MEAT', 'EGGS', 'HONEY', 'OTHER'] as const;

const emptyToUndefined = ({ value }: { value: unknown }) => (value === '' || value === null ? undefined : value);
const toOptionalInt = ({ value }: { value: unknown }) => {
  if (value === '' || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
};
const toBool = ({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value);
const upper = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value);

/**
 * Every field the treatment workflow uses must be declared here: the global
 * ValidationPipe runs with `whitelist: true`, so undeclared fields are
 * silently stripped (previously this dropped productTypes, isAntimicrobial,
 * route, prescriptionId, ... and AMU records were never created).
 */
export class CreateTreatmentDto {
  @IsString()
  @IsNotEmpty()
  animalId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  drugName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  dosage: string;

  @Transform(emptyToUndefined)
  @IsOptional()
  @IsDateString()
  administrationDate?: string;

  /** Optional: the applicable MRL rule is used as the legal minimum. */
  @Transform(toOptionalInt)
  @IsOptional()
  @IsInt({ message: 'withdrawalPeriod must be a whole number of days' })
  @Min(0)
  withdrawalPeriod?: number;

  @Transform(emptyToUndefined) @IsOptional() @IsString() @MaxLength(200) activeIngredient?: string;
  @Transform(emptyToUndefined) @IsOptional() @IsString() @MaxLength(100) route?: string;
  @Transform(emptyToUndefined) @IsOptional() @IsString() @MaxLength(200) disease?: string;
  @Transform(emptyToUndefined) @IsOptional() @IsString() @MaxLength(500) reason?: string;
  @Transform(emptyToUndefined) @IsOptional() @IsString() @MaxLength(2000) notes?: string;

  @Transform(toBool) @IsOptional() @IsBoolean() followUpRequired?: boolean;

  @Transform(emptyToUndefined) @IsOptional() @IsDateString() treatmentStartDate?: string;
  @Transform(emptyToUndefined) @IsOptional() @IsDateString() treatmentEndDate?: string;

  @Transform(emptyToUndefined) @IsOptional() @IsString() prescriptionId?: string;
  @Transform(emptyToUndefined) @IsOptional() @IsString() inventoryId?: string;

  @Transform(upper)
  @IsOptional()
  @IsIn(PRODUCT_TYPES as unknown as string[])
  productType?: string;

  @Transform(({ value }) => (Array.isArray(value) ? value.map((v) => (typeof v === 'string' ? v.trim().toUpperCase() : v)) : value))
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(PRODUCT_TYPES.length)
  @IsIn(PRODUCT_TYPES as unknown as string[], { each: true })
  productTypes?: string[];

  @Transform(toBool) @IsOptional() @IsBoolean() isAntimicrobial?: boolean;
  @Transform(toBool) @IsOptional() @IsBoolean() recordAmu?: boolean;

  @Transform(emptyToUndefined) @IsOptional() @IsString() @MaxLength(60) amuCode?: string;
  @Transform(emptyToUndefined) @IsOptional() @IsString() @MaxLength(60) withdrawalCode?: string;

  /** Accepted for backward compatibility but ignored: the author is always the signed-in veterinarian. */
  @IsOptional() @IsString() veterinarianName?: string;
  @IsOptional() @IsString() veterinarianId?: string;
  @IsOptional() @IsString() withdrawalCompletionDate?: string;
}

export class CreateMrlRuleDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  drugName: string;

  @Transform(upper)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  species: string;

  @Transform(toOptionalInt)
  @IsInt({ message: 'withdrawalPeriod must be a whole number of days' })
  @Min(0)
  withdrawalPeriod: number;

  @Transform(emptyToUndefined) @IsOptional() @IsString() @MaxLength(100) mrlLimit?: string;
  @Transform(emptyToUndefined) @IsOptional() @IsString() @MaxLength(200) substance?: string;
  @Transform(emptyToUndefined) @IsOptional() @IsString() @MaxLength(100) applicableTissue?: string;
  @Transform(emptyToUndefined) @IsOptional() @IsString() @MaxLength(40) unit?: string;
  @Transform(emptyToUndefined) @IsOptional() @IsString() @MaxLength(300) reference?: string;
  @Transform(emptyToUndefined) @IsOptional() @IsDateString() effectiveDate?: string;
}
