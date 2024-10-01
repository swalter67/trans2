import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { JwtokenService } from 'src/jwtoken/jwtoken.service';
import { JwtokenModule } from 'src/jwtoken/jwtoken.module';

@Module({
  imports: [JwtokenModule],
  controllers: [UserController],
  providers: [UserService, PrismaService, JwtokenService, JwtService],
})

export class UserModule {}