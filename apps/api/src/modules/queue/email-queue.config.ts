/** Shared by API producers and the optional standalone consumer. */
export const EMAIL_QUEUE_OPTIONS = {
  name: 'email-send',
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 86400, count: 10000 },
    removeOnFail: { age: 604800, count: 1000 },
  },
};
