import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import bcryptjs from 'bcryptjs';
import { prisma, withRetry } from './db';
import { JWT } from 'next-auth/jwt';
import { Session } from 'next-auth';
import { calculateThrottlingDelay, sleep } from './utils';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        const identifier = credentials.email.toLowerCase();

        const recentFailures = await prisma.authAttempt.count({
          where: {
            identifier,
            success: false,
            createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
          },
        });

        const delay = calculateThrottlingDelay(recentFailures);
        if (delay > 0) {
          await sleep(delay);
        }

        const user = await withRetry(() =>
          prisma.user.findUnique({
            where: { email: identifier },
          })
        );

        if (!user || !user.password) {
          await prisma.authAttempt.create({
            data: { identifier, endpoint: 'login', success: false },
          });
          throw new Error('Invalid credentials');
        }

        const isPasswordValid = await bcryptjs.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          await prisma.authAttempt.create({
            data: { identifier, endpoint: 'login', success: false },
          });
          throw new Error('Invalid credentials');
        }

        await prisma.authAttempt.create({
          data: { identifier, endpoint: 'login', success: true },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: any }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
