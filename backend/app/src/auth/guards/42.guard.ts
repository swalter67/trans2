import { ExecutionContext, HttpException, HttpStatus } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

export class FTAuthGuard extends AuthGuard('42') {
    handleRequest<TUser = any>(err: any, user: any, info: any, context: ExecutionContext, status?: any): TUser {
        if (err || !user) {
					if (err.code === "invalid_client") {
						console.log("\x1b[31mYou API Secret key id not right... Please update in .env file! and restart server\x1b[0m");

						throw new HttpException("API key invalid!", HttpStatus.FORBIDDEN);
					}
	          throw new HttpException(info.message, HttpStatus.FORBIDDEN);
        }
        return user;
    }
}