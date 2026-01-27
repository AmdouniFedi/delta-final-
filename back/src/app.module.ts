import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CausesModule } from './causes/causes.module';
import { StopsModule } from './stops/stops.module';
import { MetrageModule } from './métrage/metrage.module';
import { VitesseModule } from './vitesse/vitesse.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST'),
        port: Number(config.get<string>('DB_PORT') ?? 3306),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: false,
        logging: false,
      }),
    }),

    CausesModule,
    StopsModule,
    MetrageModule,
    VitesseModule,
  ],
})

export class AppModule { }
