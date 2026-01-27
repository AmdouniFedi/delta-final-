import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStopDto {
    @Type(() => Date)
    @IsDate()
    startTime!: Date;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    stopTime?: Date;

    @IsString()
    @MaxLength(32)
    causeCode!: string;
}
