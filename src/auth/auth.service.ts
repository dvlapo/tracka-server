import { ForbiddenException, Injectable } from '@nestjs/common';
import { SignInDto, SignUpDto } from './dto';
import * as argon2 from 'argon2';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private jwt: JwtService,
  ) {}

  async signUp(dto: SignUpDto) {
    // 1. hash password
    const hash = await argon2.hash(dto.password);

    try {
      // 2. save user in db
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hash,
          username: dto.username,
        },
      });

      // @ts-expect-error
      delete user.password;

      return {
        ...user,
        token: await this.signToken(user.id, user.email),
      };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException(
            'An account with this email already exists',
          );
        }
      }
    }
  }

  async signIn(dto: SignInDto) {
    // 1. find user by email
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!user) {
      throw new ForbiddenException('Invalid credentials');
    }

    // 2. verify password
    const pwMatches = await argon2.verify(user.password, dto.password);

    if (!pwMatches) {
      throw new ForbiddenException('Invalid credentials');
    }

    // 3. generate jwt token
    const token = await this.signToken(user.id, user.email);

    // @ts-expect-error
    delete user.password;

    return {
      ...user,
      token,
    };
  }

  async signToken(
    userId: string,
    email: string,
  ): Promise<{ access_token: string }> {
    const payload = {
      sub: userId,
      email,
    };
    const secret = this.config.get('JWT_SECRET');

    const token = await this.jwt.signAsync(payload, {
      expiresIn: '15m',
      secret,
    });

    return {
      access_token: token,
    };
  }
}
