import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateVitesseDto {
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    recordedAt?: Date;

    @Type(() => Number)
    @IsNumber()
    @Min(0)
    speed!: number;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    note?: string;
}
