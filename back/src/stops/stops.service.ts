import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cause } from '../causes/cause.entity';
import { StopEntity } from './stop.entity';
import { CreateStopDto } from './dto/create-stop.dto';
import { ListStopsQueryDto } from './dto/list-stops.query.dto';
import { UpdateStopDto } from './dto/update-stop.dto';
const MICRO_STOP_MS = 30_000; // 30s strictement
const NON_CONSIDERED_CAUSE_CODE = 'NC';

function isMicroStop(startTime: Date, stopTime?: Date | null) {
    if (!stopTime) return false;
    return (stopTime.getTime() - startTime.getTime()) < MICRO_STOP_MS;
}


function startOfDay(date: string) {
    return `${date} 00:00:00`;
}
function endOfDay(date: string) {
    return `${date} 23:59:59`;
}

const SHIFT_SECONDS = 8 * 3600;

@Injectable()
export class StopsService {
    constructor(
        @InjectRepository(StopEntity)
        private readonly stopRepo: Repository<StopEntity>,

        @InjectRepository(Cause)
        private readonly causeRepo: Repository<Cause>,
    ) { }

    async create(dto: CreateStopDto) {
        if (dto.stopTime && dto.stopTime < dto.startTime) {
            throw new BadRequestException('stopTime must be >= startTime');
        }

        // ✅ règle micro-arrêt
        const effectiveCauseCode =
            isMicroStop(dto.startTime, dto.stopTime)
                ? NON_CONSIDERED_CAUSE_CODE
                : (dto.causeCode?.trim() || '');

        // si pas micro-stop -> causeCode obligatoire
        if (!isMicroStop(dto.startTime, dto.stopTime) && !effectiveCauseCode) {
            throw new BadRequestException('causeCode is required for stops >= 30 seconds (or ongoing stops)');
        }

        // Vérifier que la cause existe (y compris "NC")
        const cause = await this.causeRepo.findOne({ where: { code: effectiveCauseCode } });
        if (!cause) {
            throw new BadRequestException(
                `Unknown causeCode "${effectiveCauseCode}". Create it in causes first (e.g. code="NC").`,
            );
        }

        const stop = this.stopRepo.create({
            startTime: dto.startTime,
            stopTime: dto.stopTime ?? null,
            causeCode: effectiveCauseCode,
        });

        return this.stopRepo.save(stop);
    }

    async findAll(query: ListStopsQueryDto) {
        const page = Number(query.page) || 1;
        const limit = 5; // Strictly limit to 5 per page as requested

        const causeCode = query.causeCode?.trim();
        const from = query.from?.trim();
        const to = query.to?.trim();
        const equipe = query.equipe;

        if (from && to && from > to) {
            throw new BadRequestException('"from" must be <= "to"');
        }

        const fromDt = from ? startOfDay(from) : undefined;
        const toDt = to ? endOfDay(to) : undefined;

        const qb = this.stopRepo
            .createQueryBuilder('s')
            .leftJoinAndSelect('s.cause', 'c')
            .orderBy('s.startTime', 'DESC')
            .addOrderBy('s.id', 'DESC')
            .take(limit)
            .skip((page - 1) * limit);

        if (causeCode) qb.andWhere('s.causeCode = :code', { code: causeCode });
        if (equipe) qb.andWhere('s.equipe = :equipe', { equipe });
        if (fromDt) qb.andWhere('s.startTime >= :from', { from: fromDt });
        if (toDt) qb.andWhere('s.startTime <= :to', { to: toDt });

        const [stops, total] = await qb.getManyAndCount();

        // Map back to the expected flat structure for the frontend
        const items = stops.map(s => ({
            id: s.id,
            startTime: s.startTime,
            stopTime: s.stopTime,
            causeCode: s.causeCode,
            equipe: s.equipe,
            causeName: s.cause?.name || 'Unnamed',
            causeCategory: s.cause?.category || 'N/A',
            causeAffectTRS: s.cause?.affectTRS ? 1 : 0,
        }));

        return { items, total, page, limit };
    }

    async findOne(id: string) {
        const stop = await this.stopRepo.findOne({ where: { id } });
        if (!stop) throw new NotFoundException(`Stop id=${id} not found`);
        return stop;
    }

    async update(id: string, dto: UpdateStopDto) {
        const stop = await this.findOne(id);

        if (dto.startTime !== undefined) stop.startTime = dto.startTime;
        if (dto.stopTime !== undefined) stop.stopTime = dto.stopTime ?? null;

        if (stop.stopTime && stop.stopTime < stop.startTime) {
            throw new BadRequestException('stopTime must be >= startTime');
        }

        // ✅ règle micro-arrêt : override automatique
        if (isMicroStop(stop.startTime, stop.stopTime)) {
            // cause forcée à "NC"
            const nc = await this.causeRepo.findOne({ where: { code: NON_CONSIDERED_CAUSE_CODE } });
            if (!nc) {
                throw new BadRequestException(
                    `Missing cause "${NON_CONSIDERED_CAUSE_CODE}". Create it in causes table.`,
                );
            }
            stop.causeCode = NON_CONSIDERED_CAUSE_CODE;
        } else {
            // si ce n'est pas un micro-arrêt, on applique la cause seulement si elle est fournie
            if (dto.causeCode !== undefined) {
                const causeCode = dto.causeCode.trim();
                const cause = await this.causeRepo.findOne({ where: { code: causeCode } });
                if (!cause) {
                    throw new BadRequestException(`Unknown causeCode "${causeCode}"`);
                }
                stop.causeCode = causeCode;
            }
        }

        return this.stopRepo.save(stop);
    }

    // ✅ downtime par cause pour un jour (ou une période) + filtre equipe
    async getDowntimeAnalytics(
        query: Pick<ListStopsQueryDto, 'from' | 'to' | 'equipe'> = {},
    ) {
        const from = query.from?.trim();
        const to = query.to?.trim();
        const equipe = query.equipe;

        if (from && to && from > to) {
            throw new BadRequestException('"from" must be <= "to"');
        }

        const fromDt = from ? startOfDay(from) : undefined;
        const toDt = to ? endOfDay(to) : undefined;

        let joinCond = 's.causeCode = c.code';
        const params: Record<string, any> = {};

        if (equipe) {
            joinCond += ' AND s.equipe = :equipe';
            params.equipe = equipe;
        }
        if (fromDt) {
            joinCond += ' AND s.startTime >= :from';
            params.from = fromDt;
        }
        if (toDt) {
            joinCond += ' AND s.startTime <= :to';
            params.to = toDt;
        }

        const qb = this.causeRepo
            .createQueryBuilder('c')
            .leftJoin(StopEntity, 's', joinCond, params)
            .select('c.code', 'causeCode')
            .addSelect('c.name', 'causeName')
            .addSelect(
                'SUM(IFNULL(TIMESTAMPDIFF(SECOND, s.startTime, IFNULL(s.stopTime, NOW())), 0))',
                'totalDowntimeSeconds',
            )
            .groupBy('c.code')
            .addGroupBy('c.name')
            .orderBy('totalDowntimeSeconds', 'DESC');

        const results = await qb.getRawMany();

        return results.map((r) => ({
            causeCode: r.causeCode,
            causeName: r.causeName || 'Unnamed',
            totalDowntimeSeconds: Number(r.totalDowntimeSeconds || 0),
        }));
    }

    // ✅ NOUVEAU: résumé par jour
    async getDailyStopsSummary(
        query: Pick<ListStopsQueryDto, 'from' | 'to' | 'equipe'> = {},
    ) {
        const from = query.from?.trim();
        const to = query.to?.trim();
        const equipe = query.equipe;

        if (from && to && from > to) {
            throw new BadRequestException('"from" must be <= "to"');
        }

        const qb = this.stopRepo
            .createQueryBuilder('s')
            .leftJoin('s.cause', 'c')
            .select('CAST(DATE(s.startTime) AS CHAR)', 'day')
            .addSelect('COUNT(*)', 'stopsCount')
            .addSelect(
                'SUM(TIMESTAMPDIFF(SECOND, s.startTime, IFNULL(s.stopTime, NOW())))',
                'totalDowntimeSeconds',
            )
            .addSelect(
                'SUM(CASE WHEN c.affect_trs = 1 THEN TIMESTAMPDIFF(SECOND, s.startTime, IFNULL(s.stopTime, NOW())) ELSE 0 END)',
                'trsDowntimeSeconds',
            )
            .where('1=1')
            .groupBy('CAST(DATE(s.startTime) AS CHAR)')
            .orderBy('day', 'DESC');

        if (equipe) qb.andWhere('s.equipe = :equipe', { equipe });
        if (from) qb.andWhere('s.startTime >= :from', { from: startOfDay(from) });
        if (to) qb.andWhere('s.startTime <= :to', { to: endOfDay(to) });

        const rows = await qb.getRawMany<{
            day: string;
            stopsCount: string | number;
            totalDowntimeSeconds: string | number;
            trsDowntimeSeconds: string | number;
        }>();

        // Base “temps max” :
        // - si equipe est filtrée => 8h
        // - sinon => 24h (3 équipes * 8h)
        // Si tu veux FORCER toujours 8h, remplace maxSeconds par SHIFT_SECONDS.
        const maxSeconds = SHIFT_SECONDS * (equipe ? 1 : 3);

        return rows.map((r) => {
            const downtime = Number(r.totalDowntimeSeconds ?? 0);
            const cappedDowntime = Math.max(0, Math.min(downtime, maxSeconds));
            const workSeconds = maxSeconds - cappedDowntime;

            // Normalize day to YYYY-MM-DD
            const dayStr = typeof r.day === 'string'
                ? r.day.split('T')[0]
                : new Date(r.day).toISOString().split('T')[0];

            return {
                day: dayStr,
                totalDowntimeSeconds: cappedDowntime,
                trsDowntimeSeconds: Number(r.trsDowntimeSeconds ?? 0),
                totalWorkSeconds: workSeconds,
                stopsCount: Number(r.stopsCount ?? 0),
            };
        });
    }
}
