import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Request } from 'express';

export class StatsInfo {
	@IsNotEmpty()
    @IsNumber()
    long_echange: number;
    
    @IsNotEmpty()
    @IsNumber()
    rebond_max: number;
    
    @IsNotEmpty()
    @IsNumber()
    bonus_score: number;
    
    @IsNotEmpty()
    @IsNumber()
    duree: number;
    
    @IsNotEmpty()
    @IsString()
    winnerId: string;
    
    @IsNotEmpty()
    @IsString()
    looserId: string;
    
    @IsNotEmpty()
    @IsNumber()
    scoreWinner: number;
    
    @IsNotEmpty()
    @IsNumber()
    scoreLoser: number;
}

export class StatsRequest extends Request {
	stat: StatsInfo;
}