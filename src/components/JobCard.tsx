import { Bookmark, BookmarkCheck, Briefcase, CalendarClock, CircleDollarSign, MapPin, Sparkles } from 'lucide-react';
import type { JobPosting } from '../../shared/types';
import { deadlineLabel, salaryLabel, statusTone } from '../lib/format';
import { Badge, Button, cn, Progress } from './ui';

export function JobCard({
  job,
  onOpen,
  onToggleSave,
  busy = false,
  dense = false,
}: {
  job: JobPosting;
  onOpen: () => void;
  onToggleSave?: () => void;
  busy?: boolean;
  dense?: boolean;
}) {
  const match = job.match?.overall ?? 0;
  const tone = match >= 75 ? 'success' : match >= 50 ? 'accent' : 'warning';
  return (
    <div className={cn('card card-hover glass-highlight flex flex-col', dense ? 'p-3.5' : 'p-4')}>
      <div className="flex items-start gap-3">
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">{job.sourceName}</Badge>
            {job.workplaceType !== 'Unknown' ? <Badge tone="info">{job.workplaceType}</Badge> : null}
            {job.isSaved ? <Badge tone="accent">Shortlisted</Badge> : null}
            {job.application ? <Badge tone="warning">{job.application.status}</Badge> : null}
          </div>
          <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug text-[var(--text)]">{job.title}</h3>
          <div className="mt-0.5 truncate text-xs font-medium text-[var(--muted)]">{job.company}</div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.68rem] text-[var(--muted-2)]">
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} /> {job.location || 'Not specified'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Briefcase size={11} /> {job.employmentType}
            </span>
            <span className="inline-flex items-center gap-1">
              <CircleDollarSign size={11} /> {salaryLabel(job.salary)}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarClock size={11} /> {deadlineLabel(job.deadline)}
            </span>
          </div>
        </button>
        {onToggleSave ? (
          <Button
            variant={job.isSaved ? 'secondary' : 'ghost'}
            size="sm"
            loading={busy}
            aria-label={job.isSaved ? 'Remove from saved jobs' : 'Save job'}
            onClick={onToggleSave}
          >
            {job.isSaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
          </Button>
        ) : null}
      </div>

      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[0.68rem]">
          <span className="inline-flex items-center gap-1 text-[var(--muted-2)]">
            <Sparkles size={11} /> Evidence match
          </span>
          <span className="font-semibold text-[var(--text)]">{match}%</span>
        </div>
        <Progress value={match} tone={tone} />
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1">
        {(job.match?.matchingSkills || []).slice(0, 4).map((skill) => (
          <span key={skill.skill} className="chip text-[var(--success)]">
            {skill.skill}
          </span>
        ))}
        {(job.match?.missingSkills || []).slice(0, 3).map((skill) => (
          <span key={skill.skill} className="chip text-[var(--danger)]">
            missing: {skill.skill}
          </span>
        ))}
        {(job.match?.partialSkills || []).slice(0, 2).map((skill) => (
          <span key={skill.skill} className="chip text-[var(--warning)]">
            partial: {skill.skill}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-2.5">
        <div className="flex items-center gap-1.5">
          <Badge tone={statusTone(job.deadline.status)}>{job.deadline.status}</Badge>
          {job.deadline.date ? <span className="text-[0.65rem] text-[var(--muted-2)]">{job.deadline.date}</span> : null}
        </div>
        <Button variant="ghost" size="sm" onClick={onOpen}>
          View evidence
        </Button>
      </div>
    </div>
  );
}
