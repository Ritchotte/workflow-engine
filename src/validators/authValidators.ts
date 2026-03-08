import { z } from 'zod';

export const registerBodySchema = z.object({
  email: z.string(),
  password: z.string(),
  name: z.string().optional(),
});

export const loginBodySchema = z.object({
  email: z.string(),
  password: z.string(),
});
