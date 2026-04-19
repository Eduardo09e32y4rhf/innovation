import axios from 'axios';
import { api } from './api';

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: 'full-time' | 'part-time' | 'contract' | 'remote';
  description: string;
  publishedAt: string;
  applicants: number;
}

export class JobsService {
  static async listPublic(): Promise<Job[]> {
    const response = await api.get('/api/ats/v1/jobs/public');
    return response.data as Job[];
  }

  static async createPublicJob(data: Omit<Job, 'id' | 'publishedAt' | 'applicants'>): Promise<Job> {
    const response = await api.post('/api/ats/v1/jobs/public', data);
    return response.data as Job;
  }

  static async apply(jobId: string, resume: File): Promise<void> {
    const formData = new FormData();
    formData.append('resume', resume);
    await api.post(`/api/ats/v1/jobs/${jobId}/apply`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
}

export default JobsService;

