import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient().$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const before = Date.now();
        const result = await query(args);
        const after = Date.now();
        const duration = after - before;

        // Log queries that take more than 500ms (potential bottleneck)
        if (duration > 500) {
           console.warn(`[SLOW QUERY DETECTED] ${model}.${operation} took ${duration}ms`);
           if (args) {
              // Log args safely without exposing deep PII
              const safeArgs = JSON.stringify(args).substring(0, 200);
              console.warn(`[SLOW QUERY ARGS] ${safeArgs}...`);
           }
        }
        return result;
      }
    }
  }
}) as unknown as PrismaClient;
