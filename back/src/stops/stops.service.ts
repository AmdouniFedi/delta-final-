import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cause } from '../causes/cause.entity';
import { StopEntity } from './stop.entity';
import { CreateStopDto } from './dto/create-stop.dto';
import { ListStopsQueryDto } from './dto/list-stops.query.dto';
import { UpdateStopDto } from './dto/update-stop.dto';

@Injectable()
export class StopsService {
    constructor(
        @InjectRepository(StopEntity)
        private readonly stopRepo: Repository<StopEntity>,

        @InjectRepository(Cause)
        private readonly causeRepo: Repository<Cause>,
    ) { }

    async create(dto: CreateStopDto) {
        const causeCode = dto.causeCode.trim();


        const cause = await this.causeRepo.findOne({ where: { code: causeCode } });
        if (!cause) {
            throw new BadRequestException(`Unknown causeCode "${causeCode}" (does not exist in causes)`);
        }

        if (dto.stopTime && dto.stopTime < dto.startTime) {
            throw new BadRequestException('stopTime must be >= startTime');
        }

        const stop = this.stopRepo.create({
            startTime: dto.startTime,
            stopTime: dto.stopTime ?? null,
            causeCode: causeCode,
        });

        return this.stopRepo.save(stop);
    }

    async findAll(query: ListStopsQueryDto) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 50;

        const qb = this.stopRepo
            .createQueryBuilder('s')
            .leftJoin(Cause, 'c', 'c.code = s.causeCode')
            .select('s.id', 'id')
            .addSelect('s.startTime', 'startTime')
            .addSelect('s.stopTime', 'stopTime')
            .addSelect('s.causeCode', 'causeCode')
            .addSelect('s.equipe', 'equipe')
            .addSelect('c.name', 'causeName')
            .addSelect('c.category', 'causeCategory')
            .orderBy('s.startTime', 'DESC')
            .take(limit)
            .skip((page - 1) * limit);

        const causeCode = query.causeCode?.trim();
        if (causeCode) {
            qb.andWhere('s.causeCode = :code', { code: causeCode });
        }

        const equipe = query.equipe;
        if (equipe) {
            qb.andWhere('s.equipe = :equipe', { equipe });
        }

        const items = await qb.getRawMany();

        const where: any = {};
        if (causeCode) where.causeCode = causeCode;
        if (equipe) where.equipe = equipe;

        const total = await this.stopRepo.count(
            Object.keys(where).length ? { where } : {},
        );

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

        if (dto.causeCode !== undefined) {
            const causeCode = dto.causeCode.trim();
            const cause = await this.causeRepo.findOne({ where: { code: causeCode } });
            if (!cause) {
                throw new BadRequestException(`Unknown causeCode "${causeCode}"`);
            }
            stop.causeCode = causeCode;
        }

        if (stop.stopTime && stop.stopTime < stop.startTime) {
            throw new BadRequestException('stopTime must be >= startTime');
        }

        return this.stopRepo.save(stop);
    }

    async getDowntimeAnalytics(equipe?: number) {
        const minutesExpr =
            'IFNULL(TIMESTAMPDIFF(MINUTE, s.startTime, IFNULL(s.stopTime, NOW())), 0)';

        const sumExpr = (equipe && [1, 2, 3].includes(equipe))
            ? `SUM(IF(s.equipe = :equipe, ${minutesExpr}, 0))`
            : `SUM(${minutesExpr})`;

        const qb = this.causeRepo
            .createQueryBuilder('c')
            .leftJoin(StopEntity, 's', 's.causeCode = c.code')
            .select('c.code', 'causeCode')
            .addSelect('c.name', 'causeName')
            .addSelect(sumExpr, 'totalDowntimeMinutes')
            .groupBy('c.code')
            .addGroupBy('c.name')
            .orderBy('totalDowntimeMinutes', 'DESC');

        if (equipe && [1, 2, 3].includes(equipe)) {
            qb.setParameter('equipe', equipe);
        }

        const results = await qb.getRawMany();

        return results.map(r => ({
            causeCode: r.causeCode,
            causeName: r.causeName || 'Unnamed',
            totalDowntimeMinutes: Number(r.totalDowntimeMinutes || 0),
        }));
    }
}
