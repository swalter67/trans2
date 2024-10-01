import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ChatService } from '../chat.service';
import { WsClient } from 'src/notification/dto/notification.dto';

@Injectable()
export class ChatListeners {
	constructor(private readonly server : ChatService) {}

  @OnEvent('chat.newMessage')
	emitNewFriend(payload: WsClient) {
		this.server.emitNewMessage(payload);
		//console.log(`Message send in room ${payload.for}:\n${payload.content}`);
	}

}
