import { Controller, Get, UseGuards, Req, Res, HttpCode, Post, Put } from '@nestjs/common';
import { AuthService } from './auth.service';
import { FTAuthGuard } from './guards/42.guard';
import { UserRequest } from 'src/dto/userRequest.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(FTAuthGuard)
  @Get('login')
  async (){};
 
  @Get('42/callback')
  @UseGuards(FTAuthGuard)
  async callbackReponse(@Req() req: any, @Res() res: any) {
		const token = await this.authService.ftCallback(req, res);
		res.cookie('jwt', token);
		HttpCode(201);
    return res.redirect(`http://${process.env.HOST_FRONT}:${process.env.PORT_FRONT}`);
  }

	@Put('2fa/enable')
  async active2fa(@Req() req: UserRequest) {
    return await this.authService.activate2FA(req.user);
  }

	@Put('2fa/disable')
  async disactive2fa(@Req() req: UserRequest) {
    return await this.authService.deactivate2FA(req.user);
  }

	@Get('2fa/uri')
	async getUri2fa(@Req() req: UserRequest) {
		return await this.authService.getUri2fa(req.user.id);
	}

	@Get('2fa/key')
	async getKey2fa(@Req() req: UserRequest) {
		return await this.authService.getKey2fa(req.user.id);
	}

	@Get('2fa/status')
	async getStatus2fa(@Req() req: UserRequest) {
		return await this.authService.getStatus2fa(req.user.id);
	}

	@Put('2fa/keygen')
	async generateKey2fa(@Req() req: UserRequest) {
		return await this.authService.generateKey2fa(req.user.id);
	}

	@Get('logout')
	async logout(@Req() req: UserRequest, @Res({passthrough:true}) res: any) {
		await this.authService.logout(req.user, res);
		return res.redirect(`http://${process.env.HOST_FRONT}:${process.env.PORT_FRONT}/logout`);
	}
}
