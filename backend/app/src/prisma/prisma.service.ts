import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
		async onModuleInit() {
				//console.log(`\x1b[32m[${process.env.APP_NAME}] -\x1b[0m ${this.formatedTime()}	\x1b[33mConnect on database.\x1b[0m`);
   			await this.$connect()
					.then(async() => {
						//console.log('\x1b[32mConnected\x1b[0m');
						await this.createAchievements();})
					.catch((err) => console.log(`\x1b[31mError: ${err}\x1b[0m`));

  	}

	

	async onModuleDestroy() {
		console.log(`\x1b[32m[${process.env.APP_NAME}] -\x1b[0m ${this.formatedTime()}	\x1b[33mDisonnect on database.\x1b[0m`);
		await this.$disconnect()
			.then(() => console.log('\x1b[34mDisconnected\x1b[0m'))
			.catch((err) => console.log(`\x1b[31mError: ${err}\x1b[0m`));;
	}
	
	formatedTime(): string {
		let date: Date = new Date(),
			day: string = (date.getDate() < 10? `0${date.getDate()}` : `${date.getDate()}`),
			month: string = (date.getMonth() < 10? `0${date.getMonth()}` : `${date.getMonth()}`),
			year: string = `${date.getFullYear()}`;
		return `${day}/${month}/${year} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
	}

	async createAchievements(): Promise<void> {
        try {
          
          const count = await this.achivements.count();
    
          if (count === 0) {
           
            await this.$queryRaw`INSERT INTO "Achivements" (name, long_echange, rebond_echange, ecard_max, duree, score_win, score_loose, max_score)
            VALUES
              ('HUTCHINSON', 0, 0, 0, 0, 0, 5, 0),
              ('STARSKY', 0, 0, 0, 0, 0, 0, 5),
              ('TESTAROSSA', 20, 20, 0, 0, 0, 0, 0),
              ('SONY CROCKETT', 0, 0, 0, 10000, 0, 0, 0),
              ('RICARDO TEUBES', 0, 130, 0, 0, 0, 0, 0),
              ('THOMAS MAGNUM', 0, 0, 0, 25000, 10, 0, 0);`; 
           }
		}
		catch (error) {
          console.error('Erreur lors de la vérification et de insertion des données :', error);
        }
      }
}
