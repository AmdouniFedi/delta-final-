import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

const MICRO_STOP_MS = 30_000; // 30s

export class CreateStopDto {
  @Type(() => Date)
  @IsDate()
  startTime!: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  stopTime?: Date;

  /**
   * causeCode requis sauf si:
   * - stopTime est fourni ET (stopTime - startTime) < 30s
   */
  @ValidateIf((o: CreateStopDto) => {
    if (!o?.stopTime) return true;      // si ongoing -> cause requise (comportement actuel)
    if (!o?.startTime) return true;
    const diffMs = o.stopTime.getTime() - o.startTime.getTime();
    return diffMs >= MICRO_STOP_MS;     // >= 30s => cause requise
  })
  @IsString()
  @MaxLength(32)
  causeCode?: string;
}
