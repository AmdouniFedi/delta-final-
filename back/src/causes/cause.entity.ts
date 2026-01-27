import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('causes')
export class Cause {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    code: string;

    @Column()
    name: string;

    @Column()
    category: string;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ name: 'affect_trs', type: 'tinyint', width: 1, default: 1 })
    affectTRS: boolean;

    @Column({ name: 'is_active', type: 'tinyint', width: 1, default: 1 })
    isActive: boolean;
}
