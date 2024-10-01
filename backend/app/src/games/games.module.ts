import { Module } from '@nestjs/common';
import { GamesService } from './games.service';
import { GameServer } from './server/server';
import { UserService } from 'src/user/user.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { StatsService } from 'src/stats/stats.service';
import { GameGateway } from './gateway/games.gateway';
import { GamesController } from './games.controller';

@Module({
	controllers: [GamesController],
  providers: [GameGateway, GameServer, UserService, PrismaService, StatsService, GamesService],
})

export class GamesModule {
}
