import { Queue } from "bullmq";
import type { ConnectionOptions } from "bullmq";

let connection: ConnectionOptions | null = null;

export function getRedisConnection(): ConnectionOptions {
  if (!connection) {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    connection = { url, maxRetriesPerRequest: null };
  }
  return connection;
}

export const REPORT_QUEUE_NAME = "report-generation";

let queue: Queue | null = null;

export function getReportQueue(): Queue {
  if (!queue) {
    queue = new Queue(REPORT_QUEUE_NAME, { connection: getRedisConnection() });
  }
  return queue;
}

export interface ReportJobData {
  reportId: string;
}
