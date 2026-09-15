import { ConnectionOptions } from "bullmq";

export const getQueueRedisOptions = (): ConnectionOptions => {
  const host = process.env.IO_REDIS_SERVER || "127.0.0.1";
  const port = parseInt(process.env.IO_REDIS_PORT || "6379", 10);
  const password = process.env.IO_REDIS_PASSWORD || undefined;

  return {
    host,
    port,
    password: password || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  };
};
