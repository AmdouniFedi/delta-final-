import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

const decimalToNumber = {
    to: (v: number) => v,
    from: (v: string | number) => Number(v),
};

@Entity({ name: 'vitesse_entries' })
@Index('idx_vitesse_recorded_at', ['recordedAt'])
export class VitesseEntry {
    @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
    id!: string;

    @Column({ name: 'recorded_at', type: 'datetime' })
    recordedAt!: Date;

    @Column({
        name: 'speed',
        type: 'decimal',
        precision: 10,
        scale: 3,
        transformer: decimalToNumber,
    })
    speed!: number;

    @Column({ name: 'note', type: 'varchar', length: 255, nullable: true })
    note!: string | null;
}
