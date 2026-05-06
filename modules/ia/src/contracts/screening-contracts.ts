export interface ScreeningInput {
  candidate: {
    fullName?: string;
    skills?: string[];
    experienceYears?: number;
    education?: string[];
  };
  jobDescription: string;
  mustHaveSkills?: string[];
  niceToHaveSkills?: string[];
}

export interface ScreeningScoreBreakdown {
  skillsMatch: number;
  experienceMatch: number;
  educationMatch: number;
  overall: number;
}

export interface ScreeningResult {
  status: 'approved' | 'review' | 'rejected';
  score: ScreeningScoreBreakdown;
  reasons: string[];
  recommendations: string[];
}
