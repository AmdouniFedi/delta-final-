import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

function toBool(value: any): boolean | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
        const v = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'y', 'on'].includes(v)) return true;
        if (['false', '0', 'no', 'n', 'off'].includes(v)) return false;
    }
    return undefined;
}

export class CreateCauseDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(32)
    code!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(128)
    name!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    category!: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    description?: string;

    @IsOptional()
    @Transform(({ value }) => toBool(value))
    @IsBoolean()
    affectTRS?: boolean;

    @IsOptional()
    @Transform(({ value }) => toBool(value))
    @IsBoolean()
    isActive?: boolean;
}
