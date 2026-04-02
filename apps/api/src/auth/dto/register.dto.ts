import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@us.edu.pl' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'strongpassword', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Jan Kowalski', required: false })
  @IsString()
  @IsOptional()
  name?: string;
}
