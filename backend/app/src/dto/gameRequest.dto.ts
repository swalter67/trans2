import { IsNumber, IsString, IsNotEmpty, IsOptional } from "class-validator";

export class gameStruct {
	@IsNumber()
	ball: vec3 ;

	@IsNumber()
	velocity: vec3;

	@IsNumber()
	paddleLeft: number;

	@IsNumber()
	paddleRight: number;

	@IsOptional()
	@IsNumber()
	scoreLeft: number;

	@IsOptional()
	@IsNumber()
	scoreRight: number;

	@IsNotEmpty()
	@IsNumber()
	timestampsClient: number;

	@IsNotEmpty()
	@IsNumber()
	timestampsServer: number;

	@IsNumber()
	action: 'WAIT' 			|
					'READY' 		|
					'LAUNCH'		|
					'DISCONNECT'|
					'PAUSE'			|
					'CONTINUE'	|
					'WIN'				|
					'LOOSE'

	@IsString()
	@IsOptional()
	leftPlayerName: string;
	rightPlayerName: string;
}

interface vec3 {
	x: number;
	y: number;
	z: number;
}