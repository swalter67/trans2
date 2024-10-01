import { Controller, Get, Post, Patch, Param, Delete, Req, HttpException, HttpStatus, Query, Body, Put } from '@nestjs/common';
import { UserService } from './user.service';
import { UserInfo, UserRequest } from 'src/dto/userRequest.dto';
import { WsClient } from 'src/notification/dto/notification.dto';
import { Users } from '@prisma/client';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  async me(@Req() req: any): Promise<any> {
	  return await this.userService.getUsr(req.user.id);
  } 
	
	@Get('friend/all')
  async getAllFds(
        @Req() req: UserRequest,
        @Query('accepted') accepted: string = 'true'): Promise<any[]> {
    return await this.userService.getFriends(req.user.id, accepted)
  }

	@Get('friend/search/:id') // Retourne uniquement 1 user 
	async friends(@Req() req: UserRequest,
						@Param('id') id: string,
						@Query('accepted') accepted: string = 'true'): Promise<Users>{
		return await this.userService.isFriend(req.user.id, id, accepted)
			.catch((err) => { throw new HttpException(err.message, HttpStatus.NOT_FOUND); });
	}

	@Post('friend/add/:id')
  async addFriendSelector(
        @Req() req: UserRequest,
        @Param('id') id : string) {
    if (req.user.id === id) 
      throw new HttpException('can not add yourself', HttpStatus.NOT_FOUND);
    return this.userService.addFriend(req.user.id, id);
  }

	@Put('friend/answer')
  async RespAskFriend(
        @Req() req: UserRequest,
        @Body() body: WsClient): Promise<Users> {
    return body.answer === 'accept' ?
				this.userService.answerFriend(body.idRequest, true) :
				body.answer === 'decline' ?
          this.userService.answerFriend(body.idRequest, false) :
          null;
  }

	@Delete('friend/chibrimise/:id')
	async DoDeleteFriend(
				@Req() req: UserRequest,
				@Param('id') id: string) {
		return this.userService.deleteFriend(req.user.id, id);
	}

	@Get('search/:id')
  async getUsr(@Param('id') id: string): Promise<Users> {
		return this.userService.getUserById(id);
  }

	@Get('search')
	async search(
				@Req() req: UserRequest,
				@Query('username') username: string = '') {
		return await this.userService.searchUserByName(req.user.id, username);
	}

  @Get('all')
  async allUsers(
				@Req() req: UserRequest,
				@Query('start') start: string = '',
				@Query('end') end: string = ''): Promise<any> {
    return await this.userService.getUsers(req.user.id, Number(start), Number(end));
  }

  @Post('block/:id')
  async block(@Req() req: UserRequest,
        @Param('id') id : string){
    await this.userService.blockUser(req.user.id, id);
  }

	@Put('unblock/:id')
	async unblock(@Req() req: UserRequest,
							@Param('id') id : string){
		await this.userService.unblockUser(req.user.id, id);
	}

	@Get('blocked/all')
	async bockedAll(@Req() req: UserRequest): Promise<any> {
		return await this.userService.getBlockedByMe(req.user.id);
	}

	@Put('update')
	async update(@Req() req: UserRequest,
							@Body() body: UserInfo): Promise<any> {
		return await this.userService.updateUser(req.user.id, body);
	}

	@Get('connected')
	async connected(@Req() req: UserRequest): Promise<any> {
		return await this.userService.getConnectedUsers();
	}

}
