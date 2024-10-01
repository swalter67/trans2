import { Body, Controller, Get, Req , Delete } from '@nestjs/common';
import { GamesService } from './games.service';
import { WsClient } from 'src/notification/dto/notification.dto';
import { UserRequest } from 'src/dto/userRequest.dto';

@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

	@Delete('refuseGame')
	async refuGame(@Req() req: UserRequest, @Body() data: WsClient) {
		return this.gamesService.refuseInvite(req.user.id, data);
	}

	@Get('online')
	async online() {
		return this.gamesService.getOnline();
	}
}