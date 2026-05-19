import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TransactionDto } from './dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    try {
      const transactions = await this.prisma.transaction.findMany({
        where: {
          userId: userId,
        },
        orderBy: { date: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      });

      return transactions;
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch transactions');
    }
  }

  async create(dto: TransactionDto, userId: string) {
    try {
      const transaction = await this.prisma.transaction.create({
        data: {
          amount: dto.amount,
          date: dto.date ? new Date(dto.date) : new Date(),
          description: dto.description,
          category: dto.category,
          userId: userId,
        },
        include: {
          user: {
            select: { id: true, username: true, email: true },
          },
        },
      });
      return {
        message: 'Transaction created successfully',
        transaction,
      };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          // Foreign key constraint — userId doesn't exist
          throw new NotFoundException(`User with id ${userId} not found`);
        }
        if (error.code === 'P2002') {
          throw new ConflictException('Duplicate transaction');
        }
      }
      throw new InternalServerErrorException('Failed to create transaction');
    }
  }

  async update(id: string, dto: TransactionDto, userId: string) {
    try {
      const transaction = await this.prisma.transaction.findUnique({
        where: { id },
      });
      if (!transaction) {
        throw new NotFoundException(`Transaction with id ${id} not found`);
      }
      const updatedTransaction = await this.prisma.transaction.update({
        where: { id },
        data: {
          amount: dto.amount,
          date: dto.date ? new Date(dto.date) : transaction.date,
          description: dto.description,
          category: dto.category,
        },
        include: {
          user: {
            select: { id: true, username: true, email: true },
          },
        },
      });
      return {
        message: 'Transaction updated successfully',
        transaction: updatedTransaction,
      };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          // Foreign key constraint — userId doesn't exist
          throw new NotFoundException(`User with id ${userId} not found`);
        }
        if (error.code === 'P2002') {
          throw new ConflictException('Duplicate transaction');
        }
      }
      throw new InternalServerErrorException('Failed to update transaction');
    }
  }

  async delete(id: string, userId: string) {
    try {
      const transaction = await this.prisma.transaction.findUnique({
        where: { id },
      });
      if (!transaction) {
        throw new NotFoundException(`Transaction with id ${id} not found`);
      }
      if (transaction.userId !== userId) {
        throw new NotFoundException(
          `Transaction with id ${id} not found for this user`,
        );
      }
      await this.prisma.transaction.delete({
        where: { id },
      });
      return { message: 'Transaction deleted successfully' };
    } catch (error) {
      throw new InternalServerErrorException('Failed to delete transaction');
    }
  }
}
