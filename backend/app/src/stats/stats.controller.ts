import { Controller, Get, Req, HttpException, HttpStatus } from '@nestjs/common';
import { StatsService } from './stats.service';
import { UserRequest } from 'src/dto/userRequest.dto';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

@Get('create')
async create(){
  return this.statsService.createAchievements();
}

@Get('createmedals')
async medals(@Req() req: UserRequest){
  return this.statsService.createAchMedals(req.user.id);
}

@Get('classement')
async getClassmt(@Req() req: any){
  return this.statsService.getUsersByIndexOrder();
}

@Get('stat')
async getStat(@Req() req: any){
  const em = await this.statsService.getHighestEcardMax(req.user.id);
  const le = await this.statsService.getHighestLongEchangeMax(req.user.id);
  const rm = await this.statsService.getHighestRebondMax(req.user.id);
  
  //return le;
  return [em, le, rm];
  //return [em, le, rm];

}

@Get('winlose')
async getWinLose(@Req() req:any){
  const wl = this.statsService.statStats(req.user.id);

  //const totalMath = wl.
  return wl;
}

@Get('stat2')
async getsts(@Req() req:any){
  const wetl = this.statsService.getStatStats(req.user.id);
  return wetl;
}


@Get('history')
async HistoryController(@Req() req: any){
  try {
    const hi = await this.statsService.getHistoryByUsr(req.user.id);
    return hi;
  } catch (error) {
    throw new HttpException(error.message, HttpStatus.NOT_FOUND);
  }

} 


@Get('achiev')
async achivt(@Req() req: UserRequest){
  const achiv = this.statsService.majStats(req.user.id);
  return achiv;
}


@Get('recal')
async rec(@Req() req: UserRequest){
  const rec =  this.statsService.reCacal(req.user.id);


}


@Get('create2')
async cre(@Req() req: UserRequest){
  const creationnne = this.statsService.createAchMedals(req.user.id);
}

}