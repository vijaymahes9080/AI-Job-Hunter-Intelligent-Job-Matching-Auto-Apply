import { useEffect, useState } from 'react';
import type { JobPosting } from '../../shared/types';
import { api, errorMessage } from '../lib/api';
import { Select } from './ui';

export function JobSelector({
  value,
  onChange,
  placeholder = 'Select a job',
  savedOnly = false,
  pageSize = 80,
  id,
}: {
  value: string;
  onChange: (job: JobPosting | null) => void;
  placeholder?: string;
  savedOnly?: boolean;
  pageSize?: number;
  id?: string;
}) {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.jobs
      .list({ pageSize, sort: 'match', savedOnly })
      .then((page) => {
        if (!cancelled) {
          setJobs(page.items);
          setError(null);
        }
      })
      .catch((caught) => {
        if (!cancelled) setError(errorMessage(caught));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pageSize, savedOnly]);

  return (
    <div>
      <Select
        id={id}
        value={value}
        onChange={(event) => onChange(jobs.find((job) => job.id === event.target.value) || null)}
        disabled={loading}
      >
        <option value="">{loading ? 'Loading jobs…' : placeholder}</option>
        {jobs.map((job) => (
          <option key={job.id} value={job.id}>
            {job.title} — {job.company} ({job.match?.overall ?? 0}% match)
          </option>
        ))}
      </Select>
      {error ? <p className="mt-1 text-xs text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
