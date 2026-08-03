import { Job, CandidateProfile, MatchExplanation } from '../types';

/**
 * AI Semantic Match Engine
 * Simulates Sentence Transformers (BERT) & Vector Similarity (FAISS / Cosine Distance)
 * to calculate detailed match scores between Candidate Resumes and Job Descriptions.
 */
export function calculateJobMatch(candidate: CandidateProfile, job: Job): MatchExplanation {
  const candidateSkillsLower = candidate.skills.map(s => s.toLowerCase());
  const jobSkills = job.skillsRequired;
  
  // Skill match analysis
  const matchingSkills: string[] = [];
  const missingSkills: string[] = [];

  jobSkills.forEach(skill => {
    const skillLower = skill.toLowerCase();
    const isMatched = candidateSkillsLower.some(cs => 
      cs === skillLower || 
      cs.includes(skillLower) || 
      skillLower.includes(cs) ||
      (skillLower.includes('ai') && cs.includes('openai')) ||
      (skillLower.includes('llm') && cs.includes('openai'))
    );
    
    if (isMatched) {
      matchingSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  });

  const skillMatchRatio = jobSkills.length > 0 ? matchingSkills.length / jobSkills.length : 1;
  const skillScore = Math.min(100, Math.round(skillMatchRatio * 100));

  // Experience level matching
  // Estimate candidate total experience from profile
  const totalCandidateExpYears = candidate.experience.reduce((acc, exp) => {
    if (exp.duration.includes('Present') || exp.duration.includes('yrs')) {
      const match = exp.duration.match(/(\d+)\s*yr/);
      return acc + (match ? parseInt(match[1]) : 2);
    }
    return acc + 2;
  }, 2);

  let experienceGap = 'Perfect match for required seniority level.';
  let expScore = 100;
  if (totalCandidateExpYears < job.experienceMin) {
    const diff = job.experienceMin - totalCandidateExpYears;
    experienceGap = `Gap of ${diff} year(s). Required: ${job.experienceMin}+ yrs, Candidate: ${totalCandidateExpYears} yrs.`;
    expScore = Math.max(50, 100 - (diff * 15));
  } else if (totalCandidateExpYears > job.experienceMax + 3) {
    experienceGap = `Candidate is slightly overqualified (${totalCandidateExpYears} yrs vs ${job.experienceMin}-${job.experienceMax} yrs).`;
    expScore = 90;
  }

  // Salary range overlap
  let salaryMatchScore = 100;
  if (candidate.preferredSalaryMin > job.salaryMax) {
    salaryMatchScore = 65;
  } else if (candidate.preferredSalaryMin >= job.salaryMin) {
    salaryMatchScore = 95;
  } else {
    salaryMatchScore = 100; // Job pays higher than candidate minimum
  }

  // Location & Workplace preference
  let locationMatchScore = 80;
  const isRemote = job.workplaceType === 'Remote';
  const locMatches = candidate.preferredLocations.some(loc => 
    loc.toLowerCase() === 'remote' || job.location.toLowerCase().includes(loc.toLowerCase())
  );
  if (isRemote || locMatches) {
    locationMatchScore = 100;
  } else if (job.workplaceType === 'Hybrid') {
    locationMatchScore = 85;
  }

  // Education match score
  let educationMatchScore = 95;
  if (candidate.education.length > 0) {
    educationMatchScore = 100;
  }

  // Certifications match score
  const certificationsMatchScore = candidate.certifications.length > 0 ? 95 : 80;

  // Weighted overall calculation (Simulating Vector Cosine Similarity weighting)
  // Skills: 50%, Experience: 20%, Salary: 10%, Location: 10%, Education & Certs: 10%
  const overallPercentage = Math.min(99, Math.max(55, Math.round(
    (skillScore * 0.50) +
    (expScore * 0.20) +
    (salaryMatchScore * 0.10) +
    (locationMatchScore * 0.10) +
    (educationMatchScore * 0.10)
  )));

  // Generate explainable match summary
  let summary = `${overallPercentage}% overall semantic match. `;
  if (overallPercentage >= 90) {
    summary += `Outstanding candidate fit! Matches ${matchingSkills.length}/${jobSkills.length} key required skills including ${matchingSkills.slice(0, 3).join(', ')}.`;
  } else if (overallPercentage >= 75) {
    summary += `Strong match! Missing only minor skills (${missingSkills.join(', ')}). High location and salary compatibility.`;
  } else {
    summary += `Moderate match. Consider highlighting ${missingSkills.slice(0, 2).join(', ')} in tailored resume before applying.`;
  }

  return {
    overallPercentage,
    matchingSkills,
    missingSkills,
    experienceGap,
    salaryMatchScore,
    locationMatchScore,
    educationMatchScore,
    certificationsMatchScore,
    summary
  };
}
