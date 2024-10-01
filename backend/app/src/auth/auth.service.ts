import { Injectable, Req, Res } from '@nestjs/common';
import { UserLog } from './dto/type.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtokenService } from 'src/jwtoken/jwtoken.service';
import { authenticator } from 'otplib';
import { UserInfoDto } from 'src/dto/userRequest.dto';
import { StatsService } from 'src/stats/stats.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService,
							private readonly jwt: JwtokenService,
							private readonly statsService: StatsService) {}

  async createUser(info: UserLog): Promise<any> {
	//console.log(info.login);
    let user = await this.prisma.users.findUnique({
      where: { intra_login: info.username}
    })
	//.catch((err) => { return });
    if (!user || user.intra_login != info.username) {
			const sevenDay: string = await this.jwt.signToken(info.username, 3600 * 24 * 7);

			let username = info.username;
			while (!await this.checkUsername(username))
				username = info.username + (Math.random()*1000).toFixed(0);
			user = await this.prisma.users.create({
        data: {
          username : username.toLowerCase(),
          intra_login: info.username.toLowerCase(),
          first_name: info.name.givenName.toLocaleLowerCase(),
          last_name: info.name.familyName.toLowerCase(),
          avatar_url: info.image,
					cookie_w: sevenDay,
					fa_key: authenticator.generateSecret()
        }}
      )
			await this.statsService.createAchMedals(user.id);
    }
		
		await this.prisma.users.update({
			where: {id: user.id},
			data: {last_co: new Date()}
		})
		// check sevenday token
		if (user.cookie_w == null){
			user.cookie_w = await this.jwt.signToken(user.intra_login, 3600 * 24 * 7);
			await this.prisma.users.update({
				where: {id: user.id},
				data: {cookie_w: user.cookie_w}
			})
		}
    return this.jwt.signToken(user.id, (60 * 30));
  }

	async checkUsername (newName: string): Promise<boolean> {
		const ifExist = await this.prisma.users.findUnique({
			where: {username: newName}
		})
		if (ifExist?.username === newName)
			return false;
		return true;
	}

  async ftCallback(@Req() req: any, @Res({passthrough:true}) res: any) {
    if (typeof req.user != 'boolean' && req.user) {
      
	const {username, name} = req.user;
      const image = req.user._json?.image?.link;
	  //console.log(req.user);
      return await this.createUser({username, name, image});
    }
  }

	async activate2FA(user: any) {
    const otpauthUrl = authenticator.keyuri(
      user.id,
      process.env.TWO_FA_APP,
      user.fa_key,
    );
		//console.log(`User: \x1b[33m${user.username}\x1b[0m activate 2FA.`);
    return await this.prisma.users.update({
      where: { id: user.id },
	  	data: { fa_uri: otpauthUrl, fa_actived: true }}); // ATTENTION LE RETOUR SONT TOUTES LES INFOS DE L'USER!!!
  }

	async deactivate2FA(user: any) {
		//console.log(`User: \x1b[33m${user.username}\x1b[0m deactivate 2FA.`);
		return await this.prisma.users.update({
			where: { id: user.id },
			data: { fa_actived: false, fa_verify: false, fa_uri: null },
		});
	}

	async getUri2fa(user: string) {
		const usr = await this.prisma.users.findUnique({
			where: { id: user },
			select: { fa_uri: true, fa_actived: true },
		});
		if (usr.fa_actived)
			return { "uri":usr.fa_uri};
		return null;
	}

	async getKey2fa(user: string) {
		const usr = await this.prisma.users.findUnique({
			where: { id: user },
			select: { fa_key: true, fa_actived: true },
		});
		if (usr.fa_actived)
			return { "key":usr.fa_key};
		return null;
	}

	async getStatus2fa(user: string) {
		const usr = await this.prisma.users.findUnique({
			where: { id: user },
			select: {
				fa_actived: true,
				fa_verify: true
			},
		});
		return { "status":usr.fa_actived,
						 "verify":usr.fa_verify};
	}

	async generateKey2fa(user: string) {
		const usr = await this.prisma.users.findUnique({
			where: { id: user },
			select: { fa_actived: true,
								fa_verify: true },
		});
		if (usr.fa_verify || (!usr.fa_actived && !usr.fa_verify)) {
			const newKey = authenticator.generateSecret();
			const newUri = authenticator.keyuri(
				user,
				process.env.TWO_FA_APP,
				newKey,
			);
			return await this.prisma.users.update({
				select: { fa_key: true, fa_uri: true },
				where: { id: user },
				data: { fa_key: newKey,
								fa_uri: newUri,
								fa_verify: false },
			});
		}
		return null;
	}

	async logout(user: UserInfoDto, res: any) {
		//console.log(`User: \x1b[33m${user.id}\x1b[0m logout.`);
		res.clearCookie('jwt');
		return await this.prisma.users.update({
			where: { id: user.id },
			data: {
				cookie_w: null,
				fa_verify: false },
		});
	}
}
