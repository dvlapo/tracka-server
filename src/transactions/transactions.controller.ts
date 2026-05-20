import {
  Controller,
  Get,
  UseGuards,
  Param,
  Post,
  Body,
  Delete,
  Put,
} from '@nestjs/common';
import { JwtGuard } from 'src/auth/guard';
import { TransactionsService } from './transactions.service';
import { TransactionDto } from './dto';
import { GetUser } from 'src/auth/decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('transactions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  @Get()
  findAll(@GetUser('id') userId: string) {
    return this.transactionsService.findAll(userId);
  }

  @Post()
  create(@GetUser('id') userId: string, @Body() dto: TransactionDto) {
    return this.transactionsService.create(dto, userId);
  }

  @Put(':id')
  update(
    @GetUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: TransactionDto,
  ) {
    return this.transactionsService.update(id, { ...dto }, userId);
  }

  @Delete(':id')
  delete(@GetUser('id') userId: string, @Param('id') id: string) {
    return this.transactionsService.delete(id, userId);
  }
}
