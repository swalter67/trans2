import { Body, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomFillSync } from 'crypto';
import { promises as fdPromises, read } from 'fs';
import { VerifyCodeDto, tokenModel } from 'src/jwtoken/dto/jwtoken..dto';
import { authenticator } from 'otplib';
import { UserInfoDto, UserRequest } from 'src/dto/userRequest.dto';
import { Response } from 'express';

@Injectable()
export class JwtokenService extends PassportStrategy(Strategy, 'jwt') {
    constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req) => {
                    let token = null;
                    if (req && req.cookies) {
                    	token = req.cookies['jwt'];
                    }
                    return token;
                },
            ]),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET,
            passReqToCallback: true,
        });
    }

		// After validation of token this function is calling
    async validate(request: Request, payload: any, done: any) {
      const user = await this.prisma.users.findUnique({
        where: { id: payload.id },
      });
    	return true;
    }

		// Create a token with id of user and time of validity in sec.
		async signToken(id: string, time: number): Promise<string> {
			return this.jwt.sign({ id: id }, {
				expiresIn: `${time}s`,
				secret: process.env.JWT_SECRET
			});
		}

		//Generate new key and replace it in .env file.
		async changeSecretKey(req: UserRequest, res: Response) {
			console.log(`\x1b[35mA false token but correctly signed was detected on IP:\x1b[42m${req.socket.remoteAddress.split(":")[3]}\x1b[0m`);
			res.clearCookie('jwt');
			res.redirect('/auth/login'); // voir si token invalide et user in game
			await fdPromises.readFile('.env', 'utf8')
				.then((data) => {
					const newKey: string = randomFillSync(Buffer.alloc(32)).toString('hex');
					data = data.replace(process.env.JWT_SECRET, newKey);
					fdPromises.writeFile('.env', data, 'utf8');
					process.env.JWT_SECRET = newKey;
					console.log("\x1b[31mSecurity: For security raison a new key was generate and replaced in .env file!\x1b[0m");
				})
				.catch((error) => {
					console.log(`\x1b[31mError while changing secret key: ${error.message}\x1b[0m
						Please change your secret key in your .env file by a new one and restart the server!`);
				});
			throw new HttpException("Forbidden", HttpStatus.FORBIDDEN);
		}

	// Check for valid but expired token.
	async checkMainJwt(payload: any, req: UserRequest, res: Response) {
		//console.log("\x1b[33mCheck main token\x1b[0m");
		//console.log(payload);
		const expSevenDay = await this.prisma.users.findFirst({
			select: { id: true, cookie_w: true },
			where: { id: payload.id }
		});

		if (!payload.id || !expSevenDay){
			res.clearCookie('jwt');
			// voir chaqngement de la cle secret
			// + throw error
			return ;//res.redirect('/auth/login');
		}

		let clear = false ;
		let generateMainToken = false;
		await this.jwt.verifyAsync(
			expSevenDay.cookie_w, {
			secret: process.env.JWT_SECRET})
				.then((decoded) => {
					if (Number(payload.iat) >= Number(decoded.iat) && Number(payload.exp) + ( 60 * 30 ) >= Number(decoded.exp))
						generateMainToken = true;})
				.catch((error) => {
					clear = true;});

		// If main token expired, delete it on db and client, and redirect to auth/login.
		if (clear) {
			res.clearCookie('jwt');
			await this.prisma.users.update({
				where: { id: expSevenDay.id},
				data: { cookie_w: null, fa_actived: false}});
			return; //res.redirect('/auth/login');
		}

		if (generateMainToken)
			this.generateMainToken(payload);

		// Generate new token and set it (request and reponse).
		const newCookie = await this.signToken(payload.id, 60 * 30);
		req.cookies['jwt']= newCookie;
		res.cookie('jwt', newCookie);
		return;
	}

	async generateMainToken(userId: tokenModel) {
		return await this.prisma.users.update({
			where: { id: userId.id},
			data: { cookie_w: await this.signToken(userId.id, 3600 * 24 * 7)}});
	}

	async faVerify(req: UserRequest, res: Response, userId: tokenModel) {
		const user = await this.prisma.users.findUnique({
			select: { id: true, fa_actived: true, fa_verify: true, fa_key: true, username: true },
      where: { id: userId.id }});
		if (!user){
			res.clearCookie('jwt');
			throw new HttpException("User not found!", HttpStatus.NOT_FOUND);
		}
		req.user.fa_key = user.fa_key;
		if (user.fa_actived && !user.fa_verify)
			await this.is2FaValid(req.body, user)
				.then((result) => {
					return result;})
		return true;
	}

	async is2FaValid(@Body() body: VerifyCodeDto, user: UserInfoDto) {
		//console.log(`\nUser: \x1b[33m${user.username}\x1b[0m give code: \x1b[31m${body.code}\x1b[0m and secret: \x1b[35m${user.fa_key}\x1b[0m.`)
		if (authenticator.verify( {
			token: body.code,
			secret: user.fa_key })) {
				//console.log("\x1b[32m2FA accepted\x1b[0m.");
				await this.prisma.users.update({
					where: { id: user.id },
					data: { fa_verify: true }});
					return true;
			}
		//console.log("\x1b[31m2FA bad code!\x1b[0m");
			throw new HttpException("Invalid 2FA code, must be provided!", HttpStatus.UNAUTHORIZED);
		}
}