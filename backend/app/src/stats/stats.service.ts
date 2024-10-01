import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StatsInfo, StatsRequest } from './stats.dto';
import { NOTFOUND } from 'dns';

@Injectable()
export class StatsService {
	constructor(private prisma : PrismaService){

  }

  async createStat(stat: StatsInfo) {
  	const levelLoser = await this.prisma.users.findFirst({
      where: { id: stat.looserId},
      select: {
        play_time: true,
	  	}
  	});

  	let newLoseTime = levelLoser.play_time + stat.duree;

  	await this.prisma.users.update({
    	where: { id :stat.looserId},
    	data: {
    		play_time: newLoseTime,
   	 }
  	})

      // ajout donnees de winnerId
      const levelWinner = await this.prisma.users.findFirst({
        where: { id: stat.winnerId},
          select: {
        level: true,
        play_time: true,
      },
    });

      let newLevel = Number((levelWinner.level + 1 + stat.bonus_score).toFixed(2));
      let newTime = levelWinner.play_time + stat.duree;
      if (levelWinner.level > 9)
      {
        await this.prisma.users.update({
          where: { id :stat.winnerId},
          data: {
            level: newLevel,
            medal: 'BRONZE',
            play_time: newTime,
          },

        })
      }
      if(levelWinner.level > 19)
      {
        await this.prisma.users.update({
          where: { id :stat.winnerId},
          data: {
            level: newLevel,
            medal: 'ARGENT',
            play_time: newTime,
          },

        }) 
      }
      if(levelWinner.level > 29)
      {
        await this.prisma.users.update({
          where: { id :stat.winnerId},
          data: {
            level: newLevel,
            medal: 'OR',
            play_time: newTime,
          },

        })
      }
      if(levelWinner.level > 39)
      {
        await this.prisma.users.update({
          where: { id :stat.winnerId},
          data: {
            level: newLevel,
            medal: 'PLATINIUM',
            play_time: newTime,
          },
        })
      }
      else{
				
        await this.prisma.users.update({
          where: { id :stat.winnerId},
          data: {
            level: newLevel,
            play_time: newTime,
          },
        })
				//.catch((err) => {
					//console.log(err)});
      }
      //return newStat;
    }

    async  getUsersByIndexOrder(): Promise<any[]> {
      const users = await this.prisma.users.findMany({
        select: {
            id : true,
            username: true,
            level: true,
            medal: true,   
        },
        orderBy: {
          level: 'desc', 
        },
      });
      return users;
    }
    
    async statStats(userId: string){
      
      const recupStats = await this.prisma.games.findMany({
        where: {
          OR: [{winnerId: userId}, {looserId: userId}]
        },
      })
      //console.log(recupStats);
      return recupStats;
    }

   async getHighestRebondMax(userId: string) {
        
        const userStats = await this.statStats(userId);
        //console.log(this.statStats);
        if (userStats.length === 0) {
          return 0;
        }
            
        const highestRebondMax = Math.max(...userStats.map(stat => stat.rebond_max));
      
        return highestRebondMax;
      }  

    async getHighestEcardMax(userId: string) {
        
        const userStats = await this.statStats(userId);
      
        if (userStats.length === 0) {
          return 0;
        }
            
        const highestEcardMax = Math.max(...userStats.map(stat => stat.ecar_max));
      
        return highestEcardMax;
      }    

      async getHighestLongEchangeMax(userId: string, where: string = null) {
        let userSearch: string;

        if (where == null)
            userSearch = userId;
        else
            userSearch = where;
        const userStats = await this.statStats(userSearch);
      
        if (userStats.length === 0) {
          return 0;
        }
            
        const highestRebondMax = Math.max(...userStats.map(stat => stat.long_echange));
      
        return highestRebondMax;

      }
      
      async getDureeMax(userId: string, where: string = null){
        let userSearch: string;

        if (where == null)
            userSearch = userId;
        else
            userSearch = where;
        const userStats = await this.statStats(userSearch);
      
        if (userStats.length === 0) {
          return 0;
        }
        const dureeMax = Math.max(...userStats.map(stat => stat.duree));
      
        return dureeMax;
      }

      async getStatStats(userId: string){
        const matchesWon = await this.prisma.games.count({
          where: {
            winnerId: userId,
          },
        });
      
        const matchesLost = await this.prisma.games.count({
          where: {
            looserId: userId,
          },
        });
      
        return {
          matchesWon,
          matchesLost,
        };
      }


      async getHistoryByUsr(userId: string): Promise<any[]> {
               
        const hist = await this.prisma.games.findMany({
          where: {
            OR: [{winnerId: userId}, {looserId: userId}]
          },
          include: {
            looserOdF: true,
            winnerIdF: true,
          },
    
        });
        return hist;
      }
    


      // a faire a la creation pour initialiser la table avec ses valeurs
      async createAchievements(): Promise<void> {
        try {
          
          const count = await this.prisma.achivements.count();
    
          if (count === 0) {
           
            await this.prisma.$queryRaw`INSERT INTO "Achivements" (name, long_echange, rebond_echange, ecard_max, duree, score_win, score_loose, max_score)
            VALUES
              ('HUTCHINSON', 0, 0, 0, 0, 0, 5, 0),
              ('STARSKY', 0, 0, 0, 0, 0, 0, 5),
              ('TESTAROSSA', 20, 20, 0, 0, 0, 0, 0),
              ('SONY CROCKETT', 0, 0, 0, 10000, 0, 0, 0),
              ('RICARDO TEUBES', 0, 130, 0, 0, 0, 0, 0),
              ('THOMAS MAGNUM', 0, 0, 0, 25000, 10, 0, 0);`; 
            
            console.log('Les instances ont été insérées avec succès.');
          } else {
            console.log('La table "Achievements" est pas vide.');
          }
        } catch (error) {
          console.error('Erreur lors de la vérification et de insertion des données :', error);
        }
      }

      
      //fonction a utiliser lors de la creation du User ou a la creation des stats plutot deuxiemen solution 
      async createAchMedals(Userid: string){
        //console.log(Userid);
        const exist = await this.prisma.achievmentMedal.findFirst({
          where: {
             userId: Userid
          },
        });
        if(!exist){
          
          const achievIds = await this.prisma.achivements.findMany({
             select: {
              id: true,
             }, 
          });
          
          const achivIdList = achievIds.map((achivt) => achivt.id);
          const medalEntree = achivIdList.map((achivId) => ({
            userId : Userid,
            achId: achivId,
            pourcent: 0,
          }));

          const create = await this.prisma.achievmentMedal.createMany({
             data: medalEntree, 
          });
            return create;
        }
        
      }
      

      async majStats(userId:string){

        // medals ou user est avec %
        await this.reCacal(userId);
        const userMedals = await this.prisma.achievmentMedal.findMany({
          where: {
            userId,
          },
        });

        userMedals.sort((a, b) => a.achId - b.achId);

        return userMedals;
        // Pour chaque AchievmentMedal, obtenir les détails de l'Achivement correspondant
        // const achievmentDetails = await Promise.all(
        //   userMedals.map(async (medal) => {
        //     const achievment = await this.prisma.achivements.findUnique({
        //       where: {
        //         id: medal.achId,
        //       },
        //     });
        //     return achievment;
        //   })
        // );
    
        // return achievmentDetails;
      }


      // recalcul des % apres une partie

      async reCacal(UserId: string){

        //match won, match loose
        const statsPlayer = await this.getStatStats(UserId);
        const le = await this.getHighestLongEchangeMax(UserId);
        const rm = await this.getHighestRebondMax(UserId);
        const emax = await this.getHighestEcardMax(UserId);
        const d_max = await this.getDureeMax(UserId);
        let ach1 = false;
        let ach2 = false;
        let ach3 = false;
        let ach4 = false;
        let ach5 = false;
        let ach6 = false;
        //ach 1 - 5 parties perdantes HUTCHINSON
        
       let valAch1 = (await statsPlayer).matchesLost / 5 * 100.0;
          if(valAch1 >= 100){
            ach1 = true;
            valAch1 = 100;
          }            
        //ach 2 STARSKY

        let  valAch2 = ((await statsPlayer).matchesWon * 100 ) / 5;
          if(valAch2 >= 100){
            ach2 = true;
            valAch2 = 100;
          }
          


        //ach 3 speedy gonzales

        let first = await le * 100 / 20;
        //console.log(first);
        let second = await rm * 100 / 20; 
        //console.log(second); 
        if (first >= 100)
          first = 100;
        if(second >= 100)
          second = 100;  
        let valAch3 = (first + second) / 2;   

        if(valAch3 >= 100 ){
          ach3 = true;
          valAch3 === 100;
        }

        //ach 4 // recherche playtime dasn user
        let valAch4= await d_max * 100000 / 360000  
        if(valAch4 >= 100) {
          valAch4 = 100;
          ach4 = true; }

        

        //ach 5
        
        let valAch5 = 0;

        valAch5 = await emax / 5 * 100;

        if(valAch5 >= 100)
          valAch5 = 100;
          ach5 = true;
        
        //ach 6

        

        let time = await d_max / 3600000;
        
        let maxpart =  ((await statsPlayer).matchesWon * 100 ) / 25;  
        
        if (time >= 100)
          time = 100;
        if(maxpart >= 100)
          maxpart = 100;  
        let valAch6 = (time + maxpart) / 2;   
        if(valAch6 >= 100)
          valAch6= 100;
          ach6 = true;



         const update = [ Number(valAch1.toFixed(2)),
                          Number(valAch2.toFixed(2)),
                          Number(valAch3.toFixed(2)),
                           Number(valAch4.toFixed(2)),
                          Number(valAch5.toFixed(2)),
                           Number(valAch6.toFixed(2)),
                         ];
                         
                         
       
        
        const achusr = await this.prisma.achievmentMedal.findMany({
          where: {
            userId: UserId,
          },
          orderBy: {
            achId: 'asc', 
          },
         
        });

        achusr.forEach(async (achievmentMedal, index) => {
          const newPercentageValue = update[index];
      
          // Mettez à jour le pourcentage pour cet enregistrement
          await this.prisma.achievmentMedal.update({
            where: {
              id: achievmentMedal.id,
            },
            data: {
              pourcent: newPercentageValue,
            },
          });
        });
        
        
        
        //console.log(valAch1, valAch2, valAch3, valAch4, valAch5, valAch6);
        return [(valAch1.toFixed(2) , ach1 , (valAch2).toFixed(2) , ach2 , valAch3.toFixed(2), ach3, valAch4.toFixed(2), ach4, valAch5.toFixed(2), ach5, valAch6.toFixed(2), ach6 )]; 
      }
   
} 
 
    