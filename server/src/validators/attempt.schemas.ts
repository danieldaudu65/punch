import { z } from 'zod';

export const submitAttemptSchema = z.object({
  answers: z
    .array(
      z.object({
        questionKey: z.string().trim().min(1).max(50),
        selectedIndex: z.number().int().min(0).max(9),
      }),
    )
    .max(50, 'Too many answers'),
});

export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;
