import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Request } from 'express';

export class UserInfoDto {
	@IsNotEmpty()
	@IsString()
	id: string;

    @IsNotEmpty()
    @IsBoolean()
	fa_actived: boolean;

    @IsNotEmpty()
    @IsBoolean()
	fa_verify: boolean;

    @IsNotEmpty()
    @IsString()
	fa_key: string;

	@IsNotEmpty()
    @IsString()
	username: string;
  }

export class UserInfo {
    @IsNotEmpty()
    @IsString()
	id: string;

	@IsNotEmpty()
	@IsString()
	username: string;

	@IsNotEmpty()
	@IsString()
	intra_name: string;

	@IsNotEmpty()
	@IsString()
	first_name: string;

	@IsNotEmpty()
	@IsString()
	last_name: string;

	@IsNotEmpty()
	@IsString()
	avatar_url: string;

	@IsNotEmpty()
	@IsBoolean()
	code_verified: boolean;

	@IsNotEmpty()
	@IsBoolean()
	two_factor_auth: boolean;

    @IsString()
	@IsOptional()
	two_factor_auth_uri: string;

	roomId?: string;
}

export class UserRequest extends Request {
	@IsNotEmpty()
	user: UserInfoDto;

	@IsOptional()
	body: any;

	@IsOptional()
	cookies: any;

	@IsOptional()
	socket: any; // Maybe not needed
}