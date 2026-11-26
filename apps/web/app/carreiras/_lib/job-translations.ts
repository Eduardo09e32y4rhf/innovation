import type { Language } from '@/app/contexts/LanguageContext';

export type JobLocale = 'en' | 'es';

export type JobLanguageTranslation = {
  title?: string;
  description?: string;
  requirements?: string[];
  benefits?: string[];
};

export type JobTranslations = Partial<Record<JobLocale, JobLanguageTranslation>>;

export type QuestionLanguageTranslation = {
  label?: string;
  options?: string[];
};

export type QuestionTranslations = Partial<Record<JobLocale, QuestionLanguageTranslation>>;

export function jobLocale(language: Language): JobLocale | null {
  if (language === 'en-US') return 'en';
  if (language === 'es-ES') return 'es';
  return null;
}

export function translatedJob<T extends {
  title: string;
  description: string;
  requirements: string[];
  benefits: string[];
  translations?: JobTranslations | null;
}>(job: T, language: Language): T {
  const translation = job.translations?.[jobLocale(language) ?? 'en'];
  if (!translation || language === 'pt-BR') return job;
  return {
    ...job,
    title: translation.title?.trim() || job.title,
    description: translation.description?.trim() || job.description,
    requirements: job.requirements.map((value, index) => translation.requirements?.[index]?.trim() || value),
    benefits: job.benefits.map((value, index) => translation.benefits?.[index]?.trim() || value),
  };
}

export function translatedQuestion<T extends {
  label: string;
  options: string[];
  translations?: QuestionTranslations | null;
}>(question: T, language: Language) {
  const translation = language === 'pt-BR' ? undefined : question.translations?.[jobLocale(language) ?? 'en'];
  if (!translation) return { label: question.label, options: question.options };
  return {
    label: translation.label?.trim() || question.label,
    options: question.options.map((value, index) => translation.options?.[index]?.trim() || value),
  };
}

export function translatedJobTitle(title: string, translations: JobTranslations | null | undefined, language: Language) {
  const locale = jobLocale(language);
  return locale ? translations?.[locale]?.title?.trim() || title : title;
}

export function hasUntranslatedQuestionContent(question: {
  label: string;
  options: string[];
  translations?: QuestionTranslations | null;
}, language: Language) {
  const locale = jobLocale(language);
  if (!locale) return false;
  const translation = question.translations?.[locale];
  return !translation?.label?.trim()
    || question.options.some((value, index) => value.trim() && !translation.options?.[index]?.trim());
}

export function hasUntranslatedJobContent(job: {
  title: string;
  description: string;
  requirements: string[];
  benefits: string[];
  translations?: JobTranslations | null;
}, language: Language) {
  const locale = jobLocale(language);
  if (!locale) return false;
  const translation = job.translations?.[locale];
  return !translation?.title?.trim()
    || !translation.description?.trim()
    || job.requirements.some((value, index) => value.trim() && !translation.requirements?.[index]?.trim())
    || job.benefits.some((value, index) => value.trim() && !translation.benefits?.[index]?.trim());
}

export function normalizeJobTranslations(value: unknown): JobTranslations | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const locales: JobTranslations = {};
  for (const locale of ['en', 'es'] as const) {
    const raw = record[locale];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const fields = raw as Record<string, unknown>;
    locales[locale] = {
      ...(typeof fields.title === 'string' ? { title: fields.title } : {}),
      ...(typeof fields.description === 'string' ? { description: fields.description } : {}),
      ...(Array.isArray(fields.requirements) ? { requirements: fields.requirements.filter((item): item is string => typeof item === 'string') } : {}),
      ...(Array.isArray(fields.benefits) ? { benefits: fields.benefits.filter((item): item is string => typeof item === 'string') } : {}),
    };
  }
  return Object.keys(locales).length ? locales : null;
}

export function normalizeQuestionTranslations(value: unknown): QuestionTranslations | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const locales: QuestionTranslations = {};
  for (const locale of ['en', 'es'] as const) {
    const raw = record[locale];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const fields = raw as Record<string, unknown>;
    locales[locale] = {
      ...(typeof fields.label === 'string' ? { label: fields.label } : {}),
      ...(Array.isArray(fields.options) ? { options: fields.options.filter((item): item is string => typeof item === 'string') } : {}),
    };
  }
  return Object.keys(locales).length ? locales : null;
}
