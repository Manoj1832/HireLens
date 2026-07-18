import { defineConfig } from 'prisma/config';
import process from 'node:process';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/hirelens?schema=public',
  },
});
