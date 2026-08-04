/**
 * offlineQueue.ts
 * Queues application submissions that fail due to no network.
 * When the browser comes back online, the queue is retried automatically.
 */

const QUEUE_KEY = 'aijh_offline_apply_queue';

export interface QueuedApplication {
  id: string;
  queuedAt: string;
  portal: string;
  jobId: string;
  jobTitle: string;
  company: string;
  applicant: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    coverLetter: string;
  };
  retries: number;
}

/** Load all queued applications from localStorage */
export function loadQueue(): QueuedApplication[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Add a new application to the offline queue */
export function enqueueApplication(app: Omit<QueuedApplication, 'id' | 'queuedAt' | 'retries'>): QueuedApplication {
  const item: QueuedApplication = {
    ...app,
    id: `offline-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    queuedAt: new Date().toISOString(),
    retries: 0
  };
  const queue = loadQueue();
  queue.push(item);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return item;
}

/** Remove a successfully submitted item from the queue */
export function dequeueApplication(id: string): void {
  const queue = loadQueue().filter(item => item.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Increment retry count for an item */
export function incrementRetry(id: string): void {
  const queue = loadQueue().map(item =>
    item.id === id ? { ...item, retries: item.retries + 1 } : item
  );
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Count of pending items */
export function getQueueCount(): number {
  return loadQueue().length;
}

/**
 * Attempt to flush the offline queue by retrying submissions.
 * Call this when `navigator.onLine` becomes true.
 * Returns the number of successfully retried items.
 */
export async function flushOfflineQueue(
  onRetried: (item: QueuedApplication, success: boolean) => void
): Promise<number> {
  const queue = loadQueue();
  if (queue.length === 0) return 0;

  let successCount = 0;

  for (const item of queue) {
    if (item.retries >= 5) {
      // Give up after 5 attempts — remove from queue
      dequeueApplication(item.id);
      continue;
    }

    try {
      const res = await fetch('/api/apply/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portal: item.portal,
          jobId: item.jobId,
          applicant: item.applicant
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (res.ok) {
        dequeueApplication(item.id);
        successCount++;
        onRetried(item, true);
      } else {
        incrementRetry(item.id);
        onRetried(item, false);
      }
    } catch {
      incrementRetry(item.id);
      onRetried(item, false);
    }
  }

  return successCount;
}
