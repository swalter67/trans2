import { Controller, Get, Req } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { UserRequest } from 'src/dto/userRequest.dto';

@Controller('notification')
export class NotificationController {

	constructor(private readonly notificationService: NotificationService) {}
	@Get('all')
	async getAll(@Req() req: UserRequest){
		// recup toutes les notifs de l'utilisateur, friend en ask, message prive non lu destine a l'utilisateur. rooms id privee ou se trouve des messages non lu
		return await this.notificationService.getAll(req.user.id);
	}
}
