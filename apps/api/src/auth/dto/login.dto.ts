import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user@us.edu.pl' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'strongpassword' })
  @IsString()
  password!: string;
}
