import { IsNotEmpty, IsObject, IsString } from "class-validator";

export class UserLog {
	@IsString()
	@IsNotEmpty()
  username:string;

	@IsObject()
	@IsNotEmpty()
  name: {
    givenName: string;
    familyName: string;
  };

	@IsString()
	@IsNotEmpty()
	image: string;
}