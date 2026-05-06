export interface ResumeParseInput {
  fileName?: string;
  mimeType?: string;
  filePath?: string;
  contentBase64?: string;
  textContent?: string;
  source?: 'upload' | 'filesystem' | 'buffer';
}

export interface ResumeParsedCandidate {
  fullName?: string;
  email?: string;
  phone?: string;
  currentRole?: string;
  professionalSummary?: string;
  skills: string[];
  experienceYears?: number;
  education: string[];
  location?: string;
  languages?: string[];
}

export interface ResumeParseResult {
  status: 'success' | 'partial' | 'error';
  message: string;
  candidate?: ResumeParsedCandidate;
  rawText?: string;
  provider?: 'python-gemini' | 'ts-local' | 'manual';
}
