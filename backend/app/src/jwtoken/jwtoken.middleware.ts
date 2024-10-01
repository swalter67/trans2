import { HttpException, HttpStatus, Injectable, Ip, NestMiddleware, Req, Res } from '@nestjs/common';
import { JwtokenService } from './jwtoken.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtokenMiddleware implements NestMiddleware {
	constructor(private readonly jwtService: JwtokenService,
			private readonly jwt: JwtService) {}

  async use(@Req()req: any, @Res()res: any, next: any ){// () => void) {
	//console.log("\x1b[33mJwtokenMiddleware\x1b[0m");
		let checkToken: boolean = false;
		let securityChange: boolean = false;
		let generateMainToken: boolean = false;
		const payload: any = await this.jwt.decode(req.cookies['jwt']);

		await this.jwt.verifyAsync(
				req.cookies['jwt'],
				{ secret: process.env.JWT_SECRET })
				.then((decoded) => {
				if ((Number(decoded.iat) + (60 * 30)) != Number(decoded.exp))
					securityChange = true;
				if (Number(payload.iat) >= Number(decoded.iat) && Number(payload.exp) + (60 * 30) >= Number(decoded.exp))
					generateMainToken = true;
				})
				.catch((error) => {
				switch (true) {
					case (error.message == "invalid signature"):
						console.log(`\x1b[31mInvalid signature from ip:\x1b[0m ${req.socket.remoteAddress.split(":")[3]} \x1b[31mand user-agent:\x1b[0m ${req.get('user-agent')}`);
						res.clearCookie('jwt');
					// At this time, need check data of user in database, the signature is invalid because the key is changed (ex: bad token but with a right signature!).
						throw new HttpException("Forbidden", HttpStatus.FORBIDDEN);
					case (error.message == "jwt expired"):
						checkToken = true;
						break;
					case (error.message == "jwt signature is required"):
						console.log("\x1b[31mSignature in your jwt is required\nIf the error persist, please check the JWT_SECRET in your .env file!\x1b[0m");
						res.clearCookie('jwt');
						throw new HttpException("Forbidden", HttpStatus.FORBIDDEN);
					case (error.message == "jwt dates are in the future"):
						console.log("\x1b[31m[WARNING!!!] \x1b[33mDate are in the future!/nThas's means some body have your SECRET_KEY and can create token!\
A new key was automaticly generate and remplaced by the old key in your .env file./n\x1b[0m");
						securityChange = true;
						break;
					default:
						//console.log("\x1b[35mWarning bad token: \x1b[0m", error.message)
						req.cookies['jwt'] = null;
						res.clearCookie('jwt');
						throw new HttpException("Forbidden", HttpStatus.FORBIDDEN);
				}});
		req.user = payload;
		if (checkToken)
			await this.jwtService.checkMainJwt(
				this.jwt.decode(req.cookies['jwt']),
				req, res);
		if (securityChange)
			await this.jwtService.changeSecretKey(req, res);
		if (generateMainToken)
			await this.jwtService.generateMainToken(payload);
		await this.jwtService.faVerify(req, res, payload);
//console.log("\x1b[32mJwtokenMiddleware OK\x1b[0m");
    next();
  }


}
