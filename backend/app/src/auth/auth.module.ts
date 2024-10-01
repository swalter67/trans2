import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { FTStrategy } from './strategy/42.strategy';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtokenModule } from 'src/jwtoken/jwtoken.module';
import { JwtokenService } from 'src/jwtoken/jwtoken.service';
import { JwtService } from '@nestjs/jwt';
import { StatsService } from 'src/stats/stats.service';

@Module({
	imports: [JwtokenModule],
	controllers: [AuthController],
  providers: [AuthService, FTStrategy, PrismaService, JwtokenService, StatsService, JwtService]
})
export class AuthModule {}
