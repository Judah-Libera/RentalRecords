export const env = {
  apiBaseUrl: 'https://rental-records-api.judahlibera.workers.dev/api',
} as const;

export type Env = typeof env;
