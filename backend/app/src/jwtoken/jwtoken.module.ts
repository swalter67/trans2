import { Module } from '@nestjs/common';
import { JwtokenService } from './jwtoken.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Module({
	imports: [],
	providers: [JwtokenService, PrismaService, JwtService],

})
export class JwtokenModule {}
