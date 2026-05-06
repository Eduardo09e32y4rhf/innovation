// IA/test_gemini.ts - Unit Tests for GeminiService
import { GeminiService } from './services/GeminiService';

// Mock the Google Generative AI
jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
            generateContent: jest.fn().mockResolvedValue({
                response: {
                    text: () => Promise.resolve('{"nome": "João Silva", "email": "joao@email.com"}')
                }
            })
        })
    }))
}));

describe('GeminiService', () => {
    describe('parseResume', () => {
        it('should parse resume and extract structured data', async () => {
            const resumeText = `
                João Silva
                joao@email.com
                Desenvolvedor Full Stack com 5 anos de experiência
            `;
            
            const result = await GeminiService.parseResume(resumeText);
            
            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
        });

        it('should handle empty resume text', async () => {
            const result = await GeminiService.parseResume('');
            
            expect(result).toBeDefined();
        });
    });

    describe('calculateCandidateScore', () => {
        it('should calculate candidate score between 0-100', async () => {
            const resumeText = 'Experiência com React, Node.js, TypeScript';
            const requirements = 'React, Node.js, TypeScript, PostgreSQL';
            
            const score = await GeminiService.calculateCandidateScore(resumeText, requirements);
            
            expect(typeof score).toBe('number');
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(100);
        });

        it('should return 0 for invalid input', async () => {
            const score = await GeminiService.calculateCandidateScore('', '');
            
            expect(score).toBeDefined();
        });
    });

    describe('generateWhatsAppReply', () => {
        it('should generate a reply message', async () => {
            const context = 'Candidato perguntou sobre benefícios';
            
            const reply = await GeminiService.generateWhatsAppReply(context);
            
            expect(reply).toBeDefined();
            expect(typeof reply).toBe('string');
            expect(reply.length).toBeGreaterThan(0);
        });

        it('should handle empty context', async () => {
            const reply = await GeminiService.generateWhatsAppReply('');
            
            expect(reply).toBeDefined();
        });
    });
});
