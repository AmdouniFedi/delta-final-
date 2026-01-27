import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateMetrageDto {
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    recordedAt?: Date;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    meters!: number;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    note?: string;
}
