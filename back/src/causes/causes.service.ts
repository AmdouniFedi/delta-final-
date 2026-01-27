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
        const limit = Number(query.limit) || 50;

        const where: any = {};
        if (query.category) where.category = query.category;

        if (query.isActive !== undefined) {
            const val = String(query.isActive).toLowerCase();
            if (val === 'true' || val === '1') {
                where.isActive = true;
            } else if (val === 'false' || val === '0') {
                where.isActive = false;
            }
        }

        if (query.affectTRS !== undefined) {
            const val = String(query.affectTRS).toLowerCase();
            if (val === 'true' || val === '1') where.affectTRS = true;
            else if (val === 'false' || val === '0') where.affectTRS = false;
        }

        let items: Cause[];
        let total: number;

        if (query.search?.trim()) {
            const s = `%${query.search.trim()}%`;
            [items, total] = await this.repo.findAndCount({
                where: [
                    { ...where, code: Like(s) },
                    { ...where, name: Like(s) },
                ],
                order: { code: 'ASC' },
                take: limit,
                skip: (page - 1) * limit,
            });
        } else {
            [items, total] = await this.repo.findAndCount({
                where,
                order: { code: 'ASC' },
                take: limit,
                skip: (page - 1) * limit,
            });
        }

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
