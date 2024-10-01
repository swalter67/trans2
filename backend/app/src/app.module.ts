import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { JwtokenModule } from './jwtoken/jwtoken.module';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma/prisma.service';
import { JwtokenService } from './jwtoken/jwtoken.service';
import { UserModule } from './user/user.module';
import { JwtokenMiddleware } from './jwtoken/jwtoken.middleware';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { NotificationModule } from './notification/notification.module';
import { ChatModule } from './chat/chat.module';
import { StatsModule } from './stats/stats.module';
import { GamesModule } from './games/games.module';

@Module({
  imports: [
      JwtokenModule,
      JwtModule.register({
		    global: true}),
			EventEmitterModule.forRoot({
				global: true,
				maxListeners: 10,
				verboseMemoryLeak: true,
				ignoreErrors: false,
			}),
			AuthModule,
      UserModule,
			ChatModule,
			NotificationModule,
			StatsModule,
			GamesModule],
  controllers: [],
  providers: [PrismaService, JwtokenService, JwtService],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(JwtokenMiddleware)
			.exclude(
				{ path: 'auth/login', method: RequestMethod.ALL},
				{ path: 'auth/42/callback', method: RequestMethod.ALL})
      .forRoutes('*');
  }
}
