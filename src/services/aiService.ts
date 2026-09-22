import { isSupabaseConfigured, requireSupabase } from '../lib/supabase';
import type {
  InterviewFeedbackResult,
  InterviewQuestionResult,
  JobMatchResult,
  ResumeAnalysisResult,
  TailoredResumeResult,
} from '../types/domain';

export type AIAction = 'resume_analysis' | 'job_match' | 'tailor_resume' | 'cover_letter' | 'interview_question' | 'interview_feedback';

export type ResumeAnalysisRecord = ResumeAnalysisResult & {
  id: string;
  documentId: string;
  provider: string;
  createdAt: string;
};

export type JobMatchRecord = JobMatchResult & {
  id: string;
  documentId: string | null;
  applicationId: string | null;
  provider: string;
  createdAt: string;
};

type JsonObject = Record<string, unknown>;

type EdgeErrorBody = {
  code?: string;
  error?: string;
};

const AI_ERROR_MESSAGES: Record<string, string> = {
  REAL_AI_REQUIRED: 'AI analysis is unavailable in development mode. Connect a real AI provider to use this feature.',
  AI_PROVIDER_UNAVAILABLE: 'The AI service is temporarily unavailable. Please try again later.',
  AI_PROVIDER_AUTHENTICATION_FAILED: 'The AI service is not configured correctly.',
  AI_PROVIDER_NOT_CONFIGURED: 'The AI service is not configured correctly.',
  SERVER_CONFIGURATION_INVALID: 'The AI service is not configured correctly.',
  AI_PROVIDER_NETWORK_ERROR: 'Unable to connect. Check your internet connection and try again.',
  AI_PROVIDER_INVALID_RESPONSE: 'The AI service returned an invalid response. Please try again.',
  AI_SERVICE_FAILED: 'The AI service is temporarily unavailable. Please try again later.',
  DOCUMENT_READ_FAILED: "We couldn't read this document. Please upload a text-based PDF or DOCX.",
  DOCUMENT_EXTRACTION_FAILED: "We couldn't read this document. Please upload a text-based PDF or DOCX.",
  NO_READABLE_TEXT: "We couldn't read this document. Please upload a text-based PDF or DOCX.",
  UNSUPPORTED_DOCUMENT_TYPE: "This document format isn't supported. Please upload a PDF or DOCX.",
  DOCUMENT_DOWNLOAD_FAILED: 'The selected resume could not be downloaded. Please upload it again and retry.',
  DOCUMENT_TOO_LARGE: 'This document is too large to analyze. Please upload a file under 10 MB.',
  EXTRACTED_TEXT_TOO_LARGE: 'This resume contains too much text to analyze safely. Please upload a shorter resume.',
  DOCUMENT_NOT_FOUND: 'The selected resume is no longer available. Please upload or select it again.',
  APPLICATION_NOT_FOUND: 'The selected application is no longer available. Please select another application.',
  INTERVIEW_SESSION_NOT_FOUND: 'This interview session is no longer available. Please start a new practice session.',
  INTERVIEW_SESSION_NOT_ACTIVE: 'This interview session is no longer active. Please start a new practice session.',
  INTERVIEW_HISTORY_FAILED: 'The interview question history could not be loaded. Please try again.',
  INTERVIEW_QUESTION_REPEATED: 'A new interview question could not be generated. Please try again.',
  AUTHENTICATION_REQUIRED: 'Your session expired. Please sign in again.',
  INVALID_SESSION: 'Your session expired. Please sign in again.',
  PROFILE_CONTEXT_FAILED: 'Your profile information could not be loaded. Please try again.',
  ANALYSIS_PERSISTENCE_FAILED: 'The analysis was generated but could not be saved. Please try again.',
  REQUEST_TOO_LARGE: 'The AI request is too large. Please shorten the supplied content and try again.',
  INVALID_REQUEST: 'The AI request could not be completed. Check your selections and try again.',
  INVALID_JSON: 'The AI request could not be completed. Please try again.',
  UNSUPPORTED_ACTION: 'This AI action is not currently supported.',
};

export class AIServiceError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'AIServiceError';
  }
}

function isRecord(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function edgeErrorBody(value: unknown): EdgeErrorBody | null {
  if (!isRecord(value)) return null;
  const code = typeof value.code === 'string' && value.code.trim() ? value.code.trim() : undefined;
  const message = typeof value.error === 'string' && value.error.trim() ? value.error.trim() : undefined;
  return code || message ? { code, error: message } : null;
}

function mappedErrorMessage(code: string | undefined, serverMessage?: string): string {
  if (code && AI_ERROR_MESSAGES[code]) return AI_ERROR_MESSAGES[code];
  if (serverMessage) return serverMessage;
  return 'The AI service is temporarily unavailable. Please try again later.';
}

function requiredNumber(value: unknown, key: string, max = 100): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) throw new Error(`The AI service returned an invalid ${key}.`);
  return Math.round(value);
}

function requiredString(value: unknown, key: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`The AI service returned an invalid ${key}.`);
  return value.trim();
}

function stringList(value: unknown, key: string): string[] {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) throw new Error(`The AI service returned an invalid ${key}.`);
  return value.map(item => item.trim()).filter(Boolean);
}

function parseResumeResult(value: unknown): ResumeAnalysisResult {
  if (!isRecord(value)) throw new Error('The AI service returned an invalid resume analysis.');
  return {
    overallScore: requiredNumber(value.overallScore, 'overall score'),
    atsCompatibility: requiredNumber(value.atsCompatibility, 'ATS score'),
    impact: requiredNumber(value.impact, 'impact score'),
    keywords: requiredNumber(value.keywords, 'keywords score'),
    readability: requiredNumber(value.readability, 'readability score'),
    strengths: stringList(value.strengths, 'strengths'),
    weaknesses: stringList(value.weaknesses, 'weaknesses'),
    missingKeywords: stringList(value.missingKeywords, 'missing keywords'),
    recommendations: stringList(value.recommendations, 'recommendations'),
  };
}

function parseJobMatchResult(value: unknown): JobMatchResult {
  if (!isRecord(value)) throw new Error('The AI service returned an invalid job match.');
  return {
    overallMatch: requiredNumber(value.overallMatch, 'overall match'),
    skillsMatch: requiredNumber(value.skillsMatch, 'skills match'),
    experienceMatch: requiredNumber(value.experienceMatch, 'experience match'),
    educationMatch: requiredNumber(value.educationMatch, 'education match'),
    keywordsMatch: requiredNumber(value.keywordsMatch, 'keywords match'),
    matchedSkills: stringList(value.matchedSkills, 'matched skills'),
    missingSkills: stringList(value.missingSkills, 'missing skills'),
    importantKeywords: stringList(value.importantKeywords, 'important keywords'),
    recommendedChanges: stringList(value.recommendedChanges, 'recommended changes'),
  };
}

function parseTailoredResumeResult(value: unknown): TailoredResumeResult {
  if (!isRecord(value)) throw new Error('The AI service returned invalid resume recommendations.');
  return {
    skillsToEmphasize: stringList(value.skillsToEmphasize, 'skills to emphasize'),
    keywordsToAdd: stringList(value.keywordsToAdd, 'keywords to add'),
    summaryImprovements: stringList(value.summaryImprovements, 'summary improvements'),
    experienceBullets: stringList(value.experienceBullets, 'experience bullets'),
    technologiesToMention: stringList(value.technologiesToMention, 'technologies'),
    missingKeywords: stringList(value.missingKeywords, 'missing keywords'),
    suggestedWording: stringList(value.suggestedWording, 'suggested wording'),
  };
}

function parseInterviewQuestion(value: unknown): InterviewQuestionResult {
  if (!isRecord(value)) throw new Error('The AI service returned an invalid interview question.');
  return { question: requiredString(value.question, 'question'), focus: requiredString(value.focus, 'question focus') };
}

function parseInterviewFeedback(value: unknown): InterviewFeedbackResult {
  if (!isRecord(value)) throw new Error('The AI service returned invalid interview feedback.');
  return {
    clarity: requiredNumber(value.clarity, 'clarity score', 10),
    relevance: requiredNumber(value.relevance, 'relevance score', 10),
    structure: requiredNumber(value.structure, 'structure score', 10),
    impact: requiredNumber(value.impact, 'impact score', 10),
    suggestion: requiredString(value.suggestion, 'feedback suggestion'),
    strengths: stringList(value.strengths, 'feedback strengths'),
    improvements: stringList(value.improvements, 'feedback improvements'),
  };
}

async function readFunctionErrorBody(error: unknown): Promise<EdgeErrorBody | null> {
  if (!isRecord(error)) return null;
  const directBody = edgeErrorBody(error);
  if (directBody) return directBody;

  const context = error.context;
  const contextBody = edgeErrorBody(context);
  if (contextBody) return contextBody;
  if (!isRecord(context)) return null;

  let response: JsonObject = context;
  if (typeof context.clone === 'function') {
    try {
      const cloned: unknown = context.clone.call(context);
      if (isRecord(cloned)) response = cloned;
    } catch { /* Some React Native response implementations do not support clone(). */ }
  }
  if (typeof response.json !== 'function') return null;
  try {
    return edgeErrorBody(await response.json.call(response));
  } catch {
    return null;
  }
}

async function functionError(error: unknown): Promise<AIServiceError> {
  const body = await readFunctionErrorBody(error);
  if (body) {
    const code = body.code || 'AI_SERVICE_FAILED';
    return new AIServiceError(code, mappedErrorMessage(body.code, body.error));
  }

  const errorName = isRecord(error) && typeof error.name === 'string' ? error.name : '';
  const errorMessage = error instanceof Error ? error.message : '';
  if (errorName === 'FunctionsFetchError' || /network request failed|failed to fetch|network error/i.test(errorMessage)) {
    return new AIServiceError('NETWORK_ERROR', 'Unable to connect. Check your internet connection and try again.');
  }
  return new AIServiceError('AI_SERVICE_FAILED', mappedErrorMessage('AI_SERVICE_FAILED'));
}

async function invoke(action: AIAction, payload: JsonObject): Promise<unknown> {
  if (!isSupabaseConfigured) throw new Error('SUPABASE_NOT_CONFIGURED');
  const client = requireSupabase();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) throw new Error('Your session expired. Please sign in again.');
  const { data, error } = await client.functions.invoke('ai-career', {
    body: { action, payload },
    headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
  });
  if (error) throw await functionError(error);
  if (!isRecord(data) || !('result' in data)) throw new Error('The AI service returned an invalid response.');
  return data.result;
}

export const AIService = {
  analyzeResume: async (payload: { documentId: string }) => parseResumeResult(await invoke('resume_analysis', payload)),
  matchJob: async (payload: { applicationId: string; documentId: string }) => parseJobMatchResult(await invoke('job_match', payload)),
  tailorResume: async (payload: { applicationId: string; documentId: string; jobMatch?: JobMatchResult }) => parseTailoredResumeResult(await invoke('tailor_resume', payload)),
  generateCoverLetter: async (payload: { applicationId: string; documentId?: string; tone: string; length: string; keyStrengths: string[] }) => {
    const result = await invoke('cover_letter', payload);
    if (!isRecord(result)) throw new Error('The AI service returned an invalid cover letter.');
    return { content: requiredString(result.content, 'cover letter') };
  },
  getInterviewQuestion: async (payload: { applicationId: string; sessionId: string; interviewType: string; difficulty: string; previousQuestion?: string }) => parseInterviewQuestion(await invoke('interview_question', payload)),
  getInterviewFeedback: async (payload: { applicationId: string; sessionId: string; question: string; answer: string; interviewType: string; difficulty: string }) => parseInterviewFeedback(await invoke('interview_feedback', payload)),
};

export async function getResumeAnalysisHistory(): Promise<ResumeAnalysisRecord[]> {
  const { data, error } = await requireSupabase().from('resume_analyses').select('*').order('created_at', { ascending: false }).limit(30);
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id as string,
    documentId: row.document_id as string,
    provider: row.provider as string,
    createdAt: row.created_at as string,
    overallScore: row.overall_score as number,
    atsCompatibility: row.ats_score as number,
    impact: row.impact_score as number,
    keywords: row.keywords_score as number,
    readability: row.readability_score as number,
    strengths: row.strengths as string[],
    weaknesses: row.weaknesses as string[],
    missingKeywords: row.missing_keywords as string[],
    recommendations: row.recommendations as string[],
  }));
}

export async function getJobMatchHistory(): Promise<JobMatchRecord[]> {
  const { data, error } = await requireSupabase().from('job_match_analyses').select('*').order('created_at', { ascending: false }).limit(30);
  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id as string,
    documentId: row.document_id as string | null,
    applicationId: row.application_id as string | null,
    provider: row.provider as string,
    createdAt: row.created_at as string,
    overallMatch: row.overall_match as number,
    skillsMatch: row.skills_match as number,
    experienceMatch: row.experience_match as number,
    educationMatch: row.education_match as number,
    keywordsMatch: row.keywords_match as number,
    matchedSkills: row.matched_skills as string[],
    missingSkills: row.missing_skills as string[],
    importantKeywords: row.important_keywords as string[],
    recommendedChanges: row.recommended_changes as string[],
  }));
}
