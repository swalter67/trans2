import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

console.log(`
Server starting...
	- Host: 	\x1b[100m${process.env.HOST_BACK}:${process.env.PORT_BACK}	\x1b[0m
	- Database:	\x1b[100m${process.env.DB_URL}\x1b[0m
	- JWT SECRET:	\x1b[100m${process.env.JWT_SECRET}\x1b[0m
	- API C_ID:	\x1b[100m${process.env.CLIENT_ID}\x1b[0m
	- API S_ID:	\x1b[100m${process.env.CLIENT_SECRET}\x1b[0m
	- API S_NEXT:	\x1b[100m${process.env.CLIENT_NEXT_SECRET}\x1b[0m\n`);
	

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [`${process.env.HOST_FRONT}`,
						`http://${process.env.HOST_FRONT}:${process.env.PORT_FRONT}`,
						`ws://${process.env.HOST_FRONT}:${process.env.PORT_FRONT}`],
    credentials: true,
  });
  app.enableShutdownHooks();
  app.use(cookieParser());
  await app.listen(process.env.PORT_BACK);
}
bootstrap();
