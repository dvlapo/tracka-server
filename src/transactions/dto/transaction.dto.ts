import { IsDateString, IsNotEmpty, IsNumber } from 'class-validator';

export class TransactionDto {
  @IsNotEmpty()
  @IsNumber()
  amount!: number;

  @IsNotEmpty()
  @IsDateString()
  date!: Date;

  @IsNotEmpty()
  description!: string;

  @IsNotEmpty()
  category!: string;
}
