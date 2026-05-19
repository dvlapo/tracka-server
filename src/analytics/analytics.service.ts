import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { startOfMonth, endOfMonth, subDays } from 'date-fns';

@Injectable()
export class AnalyticsService {
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

      if (!transactions.length) {
        return {
          totalExpenses: 0,
          thisMonthExpenses: 0,
          totalCategories: 0,
          spendingByCategory: [],
          dailySpending: [],
        };
      }

      // Total expenses
      const totalExpenses = transactions.reduce((sum, t) => sum + t.amount, 0);

      // This month’s expenses
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const thisMonthExpenses = transactions
        .filter((t) => t.date >= monthStart && t.date <= monthEnd)
        .reduce((sum, t) => sum + t.amount, 0);

      // Unique category count
      const uniqueCategories = new Set(
        transactions.map((t) => t.category || 'Other'),
      );
      const totalCategories = uniqueCategories.size;

      // Spending by category
      const spendingByCategoryMap: Record<string, number> = {};
      for (const t of transactions) {
        const name = t.category || 'Other';
        spendingByCategoryMap[name] =
          (spendingByCategoryMap[name] || 0) + t.amount;
      }
      const spendingByCategory = Object.entries(spendingByCategoryMap).map(
        ([category, total]) => ({
          category,
          total,
          percentage: (total / totalExpenses) * 100,
        }),
      );

      // Spending in last 7 days
      const last7Days = subDays(now, 6);
      const dailyMap: Record<string, number> = {};
      for (let i = 0; i < 7; i++) {
        const d = subDays(now, i);
        dailyMap[d.toISOString().slice(0, 10)] = 0;
      }

      for (const t of transactions) {
        const dateKey = t.date.toISOString().slice(0, 10);
        if (t.date >= last7Days) {
          dailyMap[dateKey] = (dailyMap[dateKey] || 0) + t.amount;
        }
      }

      const dailySpending = Object.entries(dailyMap)
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .map(([date, total]) => ({ date, total }));

      return {
        totalExpenses,
        thisMonthExpenses,
        totalCategories,
        spendingByCategory,
        dailySpending,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch transactions');
    }
  }
}
