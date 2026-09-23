import { defineCollection, z } from 'astro:content';

const docs = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['infrastructure', 'tracking', 'troubleshooting']),
    pubDate: z.string(),
    author: z.string().default('AdOps Team'),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = {
  docs,
};
