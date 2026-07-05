
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FacialRecognitionService {
  private readonly logger = new Logger(FacialRecognitionService.name);
  private readonly comprefaceUrl: string;
  private readonly comprefaceApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.comprefaceUrl = this.configService.get<string>('COMPREFACE_URL') || 'http://localhost:8000';
    this.comprefaceApiKey = this.configService.get<string>('COMPREFACE_API_KEY') || '';
  }

  async addSubject(subjectId: string): Promise<void> {
    try {
      const res = await fetch(`${this.comprefaceUrl}/api/v1/recognition/subjects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.comprefaceApiKey,
        },
        body: JSON.stringify({ subject: subjectId }),
      });
      if (!res.ok) {
        const error = await res.text();
        if (!error.includes('already exists')) {
          throw new Error(error);
        }
      }
    } catch (error: any) {
      this.logger.error(`Failed to add subject ${subjectId}: ${error.message}`);
      throw new HttpException('Failed to communicate with Facial Recognition Service', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async addFace(subjectId: string, imageBase64: string): Promise<any> {
    try {
      // Remove data:image/jpeg;base64, if present
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const blob = new Blob([buffer], { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', blob, 'face.jpg');

      const res = await fetch(`${this.comprefaceUrl}/api/v1/recognition/faces?subject=${subjectId}`, {
        method: 'POST',
        headers: {
          'x-api-key': this.comprefaceApiKey,
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }
      return await res.json();
    } catch (error: any) {
      this.logger.error(`Failed to add face for ${subjectId}: ${error.message}`);
      throw new HttpException('Failed to add face', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async recognize(imageBase64: string): Promise<{ subject: string; similarity: number; liveness?: boolean } | null> {
    try {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const blob = new Blob([buffer], { type: 'image/jpeg' });
      const formData = new FormData();
      formData.append('file', blob, 'face.jpg');

      // Request face recognition with liveness check if plugin is available
      const res = await fetch(`${this.comprefaceUrl}/api/v1/recognition/recognize?limit=1&face_plugins=liveness`, {
        method: 'POST',
        headers: {
          'x-api-key': this.comprefaceApiKey,
        },
        body: formData,
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }
      
      const data = (await res.json()) as any;
      if (!data.result || data.result.length === 0) {
        return null; // No face found
      }

      const topResult = data.result[0];
      const match = topResult.subjects && topResult.subjects.length > 0 ? topResult.subjects[0] : null;
      
      if (!match) return null;

      // Check similarity and liveness
      return {
        subject: match.subject,
        similarity: match.similarity,
        liveness: topResult.age ? undefined : topResult.liveness?.prob > 0.8 // assuming typical compreface liveness plugin response
      };
    } catch (error: any) {
      this.logger.error(`Failed to recognize face: ${error.message}`);
      return null; // Silent fail for fallback mechanism
    }
  }
}
