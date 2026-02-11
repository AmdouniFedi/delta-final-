// stop.entity.ts
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Cause } from '../causes/cause.entity';

@Entity({ name: 'stops' })
@Index('idx_stops_start_time', ['startTime'])
@Index('idx_stops_stop_time', ['stopTime'])
@Index('idx_stops_cause_code', ['causeCode'])
@Index('idx_stops_equipe', ['equipe']) // optional
export class StopEntity {
    @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
    id!: string;

    @Column({ name: 'start_time', type: 'datetime' })
    startTime!: Date;

    @Column({ name: 'stop_time', type: 'datetime', nullable: true })
    stopTime!: Date | null;

    @Column({ name: 'cause_code', type: 'varchar', length: 32 })
    causeCode!: string;

    // NEW:
    @Column({ name: 'equipe', type: 'tinyint', insert: false, update: false })
    equipe!: number;

    @ManyToOne(() => Cause, { eager: false })
    @JoinColumn({ name: 'cause_code', referencedColumnName: 'code' })
    cause?: Cause;
}
