import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Request} from 'express';

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
    @IsNumber()
    level: number;
    
}

export class UserRequest extends Request {
    user: UserInfo;
}