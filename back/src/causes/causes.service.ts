import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { Cause } from './cause.entity';
import { CreateCauseDto } from './dto/create-cause.dto';
import { ListCausesQueryDto } from './dto/list-causes.query.dto';
import { UpdateCauseDto } from './dto/update-cause.dto';

@Injectable()
export class CausesService {
    constructor(
        @InjectRepository(Cause)
        private readonly repo: Repository<Cause>,
    ) { }

    async create(dto: CreateCauseDto): Promise<Cause> {
        const cause = this.repo.create({
            code: dto.code.trim(),
            name: dto.name.trim(),
            category: dto.category.trim(),
            description: dto.description?.trim() ?? null,
            affectTRS: dto.affectTRS ?? true,
            isActive: dto.isActive ?? true,
        });

        try {
            return await this.repo.save(cause);
        } catch (e: any) {
            if (e?.code === 'ER_DUP_ENTRY') {
                throw new ConflictException(`Cause with code "${cause.code}" already exists.`);
            }
            throw e;
        }
    }

    async findAll(query: ListCausesQueryDto) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 1000; // Increased default to show all as requested

        const qb = this.repo.createQueryBuilder('c');

        if (query.category) {
            qb.andWhere('c.category = :category', { category: query.category });
        }

        if (query.isActive !== undefined) {
            qb.andWhere('c.isActive = :isActive', { isActive: query.isActive });
        }

        if (query.affectTRS !== undefined) {
            qb.andWhere('c.affectTRS = :affectTRS', { affectTRS: query.affectTRS });
        }

        if (query.search?.trim()) {
            const s = `%${query.search.trim()}%`;
            qb.andWhere('(c.code LIKE :s OR c.name LIKE :s)', { s });
        }

        qb.orderBy('c.code', 'ASC')
            .addOrderBy('c.id', 'ASC')
            .take(limit)
            .skip((page - 1) * limit);

        const [items, total] = await qb.getManyAndCount();

        return { items, total, page, limit };
    }

    async findOne(id: string): Promise<Cause> {
        const cause = await this.repo.findOne({ where: { id } });
        if (!cause) throw new NotFoundException(`Cause id=${id} not found`);
        return cause;
    }

    async update(id: string, dto: UpdateCauseDto): Promise<Cause> {
        const cause = await this.findOne(id);

        if (dto.code !== undefined) cause.code = dto.code.trim();
        if (dto.name !== undefined) cause.name = dto.name.trim();
        if (dto.category !== undefined) cause.category = dto.category.trim();
        if (dto.description !== undefined) cause.description = dto.description?.trim() ?? null;
        if (dto.affectTRS !== undefined) cause.affectTRS = dto.affectTRS;
        if (dto.isActive !== undefined) cause.isActive = dto.isActive;

        try {
            return await this.repo.save(cause);
        } catch (e: any) {
            if (e?.code === 'ER_DUP_ENTRY') {
                throw new ConflictException(`Cause with code "${cause.code}" already exists.`);
            }
            throw e;
        }
    }
}
