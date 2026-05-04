import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// Add APM-style slow query monitoring
prisma.$use(async (params, next) => {
   const before = Date.now();
   
   const result = await next(params);
   
   const after = Date.now();
   const duration = after - before;
   
   // Log queries that take more than 500ms (potential bottleneck)
   if (duration > 500) {
      console.warn(`[SLOW QUERY DETECTED] ${params.model}.${params.action} took ${duration}ms`);
      if (params.args) {
         // Log args safely without exposing deep PII
         const safeArgs = JSON.stringify(params.args).substring(0, 200);
         console.warn(`[SLOW QUERY ARGS] ${safeArgs}...`);
      }
   }
   
   return result;
});
