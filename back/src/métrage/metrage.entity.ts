import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

const decimalToNumber = {
    to: (v: number) => v,
    from: (v: string | number) => Number(v),
};

@Entity({ name: 'metrage_entries' })
@Index('idx_metrage_recorded_at', ['recordedAt'])
export class MetrageEntry {
    @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
    id!: string;

    @Column({ name: 'recorded_at', type: 'datetime' })
    recordedAt!: Date;

    @Column({
        name: 'meters',
        type: 'decimal',
        precision: 12,
        scale: 3,
        transformer: decimalToNumber,
    })
    meters!: number;

    @Column({ name: 'note', type: 'varchar', length: 255, nullable: true })
    note!: string | null;
}
