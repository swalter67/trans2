import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class tokenModel {
    @IsNotEmpty()
    @IsString()
		id: string;

    @IsNotEmpty()
    @IsNumber()
		iat: number;

    @IsNotEmpty()
    @IsNumber()
		exp: number;
}

export class VerifyCodeDto {
  @IsNotEmpty()
  @IsString()

  readonly code: string;
}
