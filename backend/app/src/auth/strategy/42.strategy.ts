import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-42";

@Injectable()
export class FTStrategy extends PassportStrategy(Strategy, '42'){
    constructor () {
        super({
            clientID: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            callbackURL: process.env.CALLBACK_URL
        });
    }
		// We can check if the CLIENT_SECRET is out of date, in this case, we can change it in .env file by the CLIENT_NEXT_SECRET and check if we can have the next CLIENT_SECRET un API42.
		// If we can ask for a next key in API42, do that and take it and put in .env file on CLIENT_NEXT_SECRET.
		// Not problem for renew key after.
    async validate ( accessToken: string,
                    refreshToken: string,
                    profile: any,
                    done: any) {
            done(null, profile);
        }
}