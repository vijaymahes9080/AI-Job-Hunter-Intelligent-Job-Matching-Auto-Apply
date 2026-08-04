import type { AgentScoutConfig, AgentScoutLog, Job, CandidateProfile } from '../types';

export const DEFAULT_AGENT_CONFIG: AgentScoutConfig = {
  enabled: false,
  minMatchScore: 80,
  autoTailorResume: true,
  autoApplyQueue: true,
  webhookUrl: 'https://discord.com/api/webhooks/demo-ai-job-hunter',
  webhookPlatform: 'Discord',
  checkIntervalMinutes: 15
};

export async function sendWebhookNotification(
  config: AgentScoutConfig,
  job: Job,
  matchScore: number
): Promise<boolean> {
  const payload = {
    content: `🚀 **AI Job Hunter Scout Match Alert!**`,
    embeds: [
      {
        title: `${job.title} at ${job.company}`,
        description: `Match Score: **${matchScore}%** | Location: ${job.location} | Source: ${job.sourcePortal}`,
        color: 5814783,
        fields: [
          { name: 'Salary Range', value: `${job.salaryCurrency} ${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}`, inline: true },
          { name: 'Workplace', value: job.workplaceType, inline: true },
          { name: 'Required Skills', value: job.skillsRequired.slice(0, 4).join(', '), inline: false }
        ],
        footer: { text: 'AI Job Hunter Multi-Agent Autonomous Scout' }
      }
    ]
  };

  console.log(`[Agent Scout] Dispatching ${config.webhookPlatform} webhook to ${config.webhookUrl}:`, payload);
  // Simulating successful dispatch
  return true;
}
