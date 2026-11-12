import { createApp } from './app.js';
import { config } from './config.js';
import { createDatabase, type Database } from './db/index.js';
import { seedDemoData } from './db/seed.js';
import { logger } from './logger.js';
import { discoverJobs } from './services/discovery.js';
import { scanDeadlines } from './services/notifications.js';

let schedulerTimer: NodeJS.Timeout | null = null;
let schedulerRunning = false;

async function schedulerTick(db: Database): Promise<void> {
  if (schedulerRunning) return;
  schedulerRunning = true;
  try {
    logger.info('scheduler_discovery_started');
    await discoverJobs(db);
    const users = await db.query<{ id: string }>('SELECT id FROM users');
    for (const user of users.rows) {
      await scanDeadlines(db, user.id);
    }
    logger.info('scheduler_discovery_finished', { users: users.rows.length });
  } catch (error) {
    logger.error('scheduler_failed', { error: error instanceof Error ? error.message : String(error) });
  } finally {
    schedulerRunning = false;
    schedulerTimer = setTimeout(() => {
      void schedulerTick(db);
    }, Math.max(5, config.discovery.intervalMinutes) * 60_000);
    schedulerTimer.unref();
  }
}

async function main(): Promise<void> {
  const db = await createDatabase();
  await seedDemoData(db);
  const app = await createApp(db);

  const server = app.listen(config.port, () => {
    logger.info('server_started', {
      port: config.port,
      env: config.env,
      database: db.kind,
      demoMode: config.demoMode,
      appUrl: config.appUrl,
      ai: config.llm.baseUrl ? `open-model (${config.llm.model})` : 'deterministic',
    });
  });

  if (config.discovery.enabled) {
    schedulerTimer = setTimeout(() => {
      void schedulerTick(db);
    }, 10_000);
    schedulerTimer.unref();
    logger.info('scheduler_enabled', { intervalMinutes: config.discovery.intervalMinutes });
  }

  const shutdown = async (signal: string) => {
    logger.info('shutdown_started', { signal });
    if (schedulerTimer) clearTimeout(schedulerTimer);
    server.close(async () => {
      await db.close().catch(() => undefined);
      logger.info('shutdown_complete');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error) => {
  logger.error('startup_failed', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  process.exit(1);
});
