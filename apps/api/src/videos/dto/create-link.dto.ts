import { IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateLinkDto {
  @IsUrl({ require_protocol: true })
  url!: string;

  @IsIn(['YOUTUBE', 'STREAM'])
  sourceType!: 'YOUTUBE' | 'STREAM';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;
}
