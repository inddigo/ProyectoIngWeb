import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  updateName(id: string, name: string) {
    return this.prisma.user.update({
      where: { id },
      data: { name },
      select: { id: true, name: true, email: true, role: true },
    });
  }

  exportAccount(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        professionalProfile: true,
        orders: { include: { webReferences: true, quote: true } },
        quotes: {
          select: {
            id: true,
            orderId: true,
            estimatedPrice: true,
            details: true,
            breakdown: true,
            createdAt: true,
          },
        },
        recommendations: {
          select: {
            id: true,
            orderId: true,
            input: true,
            result: true,
            createdAt: true,
          },
        },
      },
    });
  }

  deleteAccount(id: string) {
    return this.prisma.user.delete({ where: { id }, select: { id: true } });
  }
}
