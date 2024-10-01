import { Optional } from "@nestjs/common";
import { IsDate, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class WsClient {
	@IsNumber()
	@IsNotEmpty()
	idRequest: number;

	@IsString()
	@IsNotEmpty()
	username: string;

	@IsString()
	@Optional()
	sendFrom: string;

	@IsString()
	@IsNotEmpty()
	sendTo: string;

	@IsString()
	@IsOptional()
	for: number | string;

	@IsString()
	@IsOptional()
	avatar: string;

	@IsString()
	type: 'newFriend' |
				'OK' |
				'newMessage' |
				'newPrivateMessage' |
				'newPublicMessage' |
				'newInviteRoom' |
				'inviteGame' |
				'newGame' |
				'newRoomStatus';
	
	@IsString()
	@IsOptional()
	content: string;

	@IsString()
	@IsOptional()
	answer: 'answer' |
					'accept' |
					'decline' |
					'join' |
					'leave';

	@IsDate()
	@IsOptional()
	//@IsNotEmpty()
	date: Date;

	@IsString()
	@IsOptional()
	cookie?: string;
}

