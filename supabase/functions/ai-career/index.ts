import { createClient } from "@supabase/supabase-js";
import { extractResumeText } from "./documentText.ts";
import {
  AnalysisPersistenceError,
  DocumentContentError,
  MalformedProviderResponseError,
  PublicFunctionError,
  RequestValidationError,
} from "./errors.ts";
import { configuredProvider } from "./providers.ts";
import type { AIAction, JsonObject } from "./types.ts";
import {
  interviewQuestionHistory,
  isRepeatedInterviewQuestion,
} from "./interviewCoach.ts";

const actions: AIAction[] = [
  "resume_analysis",
  "job_match",
  "tailor_resume",
  "cover_letter",
  "interview_question",
  "interview_feedback",
];
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const placeholderValues = new Set([
  "rien",
  "none",
  "nothing",
  "n/a",
  "na",
  "null",
  "undefined",
  "aucun",
  "aucune",
  "-",
]);
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function isRecord(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredString(
  payload: JsonObject,
  key: string,
  maxLength: number,
  allowed?: readonly string[],
): string {
  const value = payload[key];
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new RequestValidationError(`Invalid ${key}.`);
  }
  const normalized = value.trim();
  if (allowed && !allowed.includes(normalized)) {
    throw new RequestValidationError(`Invalid ${key}.`);
  }
  return normalized;
}

function optionalString(
  payload: JsonObject,
  key: string,
  maxLength: number,
): string | undefined {
  const value = payload[key];
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || value.length > maxLength) {
    throw new RequestValidationError(`Invalid ${key}.`);
  }
  return value.trim() || undefined;
}

function requiredUuid(payload: JsonObject, key: string): string {
  const value = requiredString(payload, key, 36);
  if (!uuidPattern.test(value)) {
    throw new RequestValidationError(`Invalid ${key}.`);
  }
  return value;
}

function optionalUuid(payload: JsonObject, key: string): string | undefined {
  const value = payload[key];
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !uuidPattern.test(value)) {
    throw new RequestValidationError(`Invalid ${key}.`);
  }
  return value;
}

function stringList(value: unknown, key: string, maxItems = 30): string[] {
  if (
    !Array.isArray(value) || value.length > maxItems ||
    value.some((item) =>
      typeof item !== "string" || !item.trim() || item.length > 500
    )
  ) {
    throw new RequestValidationError(`Invalid ${key}.`);
  }
  return (value as string[]).map((item) => item.trim());
}

function validatePayload(action: AIAction, raw: unknown): JsonObject {
  if (!isRecord(raw)) {
    throw new RequestValidationError("The payload must be an object.");
  }
  if (action === "resume_analysis") {
    return { documentId: requiredUuid(raw, "documentId") };
  }
  if (action === "job_match") {
    return {
      documentId: requiredUuid(raw, "documentId"),
      applicationId: requiredUuid(raw, "applicationId"),
    };
  }
  if (action === "tailor_resume") {
    let jobMatch: JsonObject | undefined;
    if (raw.jobMatch !== undefined) {
      try {
        jobMatch = validateResult("job_match", raw.jobMatch);
      } catch {
        throw new RequestValidationError("Invalid jobMatch.");
      }
    }
    return {
      documentId: requiredUuid(raw, "documentId"),
      applicationId: requiredUuid(raw, "applicationId"),
      ...(jobMatch ? { jobMatch } : {}),
    };
  }
  if (action === "cover_letter") {
    const documentId = optionalUuid(raw, "documentId");
    return {
      applicationId: requiredUuid(raw, "applicationId"),
      ...(documentId ? { documentId } : {}),
      tone: requiredString(raw, "tone", 20, [
        "PROFESSIONAL",
        "CONFIDENT",
        "CONCISE",
        "ENTHUSIASTIC",
      ]),
      length: requiredString(raw, "length", 10, ["SHORT", "MEDIUM", "LONG"]),
      keyStrengths: stringList(raw.keyStrengths || [], "keyStrengths", 20),
    };
  }
  const common = {
    applicationId: requiredUuid(raw, "applicationId"),
    sessionId: requiredUuid(raw, "sessionId"),
    interviewType: requiredString(raw, "interviewType", 80),
    difficulty: requiredString(raw, "difficulty", 20, [
      "BEGINNER",
      "INTERMEDIATE",
      "ADVANCED",
    ]),
  };
  if (action === "interview_question") {
    const previousQuestion = optionalString(raw, "previousQuestion", 4_000);
    return { ...common, ...(previousQuestion ? { previousQuestion } : {}) };
  }
  return {
    ...common,
    question: requiredString(raw, "question", 4_000),
    answer: requiredString(raw, "answer", 12_000),
  };
}

function outputString(
  result: JsonObject,
  key: string,
  maxLength: number,
): string {
  const value = result[key];
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new MalformedProviderResponseError();
  }
  return value.trim();
}

function score(result: JsonObject, key: string, max = 100): number {
  const value = result[key];
  if (
    typeof value !== "number" || !Number.isFinite(value) || value < 0 ||
    value > max
  ) throw new MalformedProviderResponseError();
  return Math.round(value);
}

function resultList(result: JsonObject, key: string, minimum = 0): string[] {
  const value = result[key];
  if (
    !Array.isArray(value) || value.length < minimum || value.length > 100 ||
    value.some((item) =>
      typeof item !== "string" || !item.trim() || item.length > 1_000
    )
  ) {
    throw new MalformedProviderResponseError();
  }
  return (value as string[]).map((item) => item.trim());
}

function validateResult(action: AIAction, raw: unknown): JsonObject {
  if (!isRecord(raw)) throw new MalformedProviderResponseError();
  if (action === "resume_analysis") {
    return {
      overallScore: score(raw, "overallScore"),
      atsCompatibility: score(raw, "atsCompatibility"),
      impact: score(raw, "impact"),
      keywords: score(raw, "keywords"),
      readability: score(raw, "readability"),
      strengths: resultList(raw, "strengths", 1),
      weaknesses: resultList(raw, "weaknesses", 1),
      missingKeywords: resultList(raw, "missingKeywords"),
      recommendations: resultList(raw, "recommendations", 1),
    };
  }
  if (action === "job_match") {
    return {
      overallMatch: score(raw, "overallMatch"),
      skillsMatch: score(raw, "skillsMatch"),
      experienceMatch: score(raw, "experienceMatch"),
      educationMatch: score(raw, "educationMatch"),
      keywordsMatch: score(raw, "keywordsMatch"),
      matchedSkills: resultList(raw, "matchedSkills"),
      missingSkills: resultList(raw, "missingSkills"),
      importantKeywords: resultList(raw, "importantKeywords", 1),
      recommendedChanges: resultList(raw, "recommendedChanges", 1),
    };
  }
  if (action === "tailor_resume") {
    return {
      skillsToEmphasize: resultList(raw, "skillsToEmphasize"),
      keywordsToAdd: resultList(raw, "keywordsToAdd"),
      summaryImprovements: resultList(raw, "summaryImprovements", 1),
      experienceBullets: resultList(raw, "experienceBullets", 1),
      technologiesToMention: resultList(raw, "technologiesToMention"),
      missingKeywords: resultList(raw, "missingKeywords"),
      suggestedWording: resultList(raw, "suggestedWording", 1),
    };
  }
  if (action === "cover_letter") {
    return { content: outputString(raw, "content", 30_000) };
  }
  if (action === "interview_question") {
    return {
      question: outputString(raw, "question", 4_000),
      focus: outputString(raw, "focus", 200),
    };
  }
  return {
    clarity: score(raw, "clarity", 10),
    relevance: score(raw, "relevance", 10),
    structure: score(raw, "structure", 10),
    impact: score(raw, "impact", 10),
    suggestion: outputString(raw, "suggestion", 4_000),
    strengths: resultList(raw, "strengths", 1),
    improvements: resultList(raw, "improvements", 1),
  };
}

function contextString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || placeholderValues.has(normalized.toLowerCase())) {
    return null;
  }
  return normalized;
}

function sanitizedProfile(profile: JsonObject | null): JsonObject {
  if (!profile) return { skills: [] };
  const result: JsonObject = {};
  for (
    const key of [
      "first_name",
      "last_name",
      "current_job_title",
      "career_goal",
      "city",
      "country",
    ]
  ) {
    const value = contextString(profile[key]);
    if (value) result[key] = value;
  }
  result.years_of_experience = typeof profile.years_of_experience === "number"
    ? profile.years_of_experience
    : null;
  result.skills = Array.isArray(profile.skills)
    ? profile.skills.map(contextString).filter((value): value is string =>
      Boolean(value)
    ).slice(0, 100)
    : [];
  return result;
}

function publishableKey(): string | null {
  const encoded = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (encoded) {
    try {
      const keys: unknown = JSON.parse(encoded);
      if (isRecord(keys)) {
        const current = Object.values(keys).find((value) =>
          typeof value === "string"
        );
        if (typeof current === "string") return current;
      }
    } catch {
      // Fall through to the legacy key for older/local projects.
    }
  }
  return Deno.env.get("SUPABASE_ANON_KEY") || null;
}

function json(body: JsonObject, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return json(
      { error: "Method not allowed.", code: "METHOD_NOT_ALLOWED" },
      405,
    );
  }
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json({
      error: "Authentication required.",
      code: "AUTHENTICATION_REQUIRED",
    }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const clientKey = publishableKey();
  if (!supabaseUrl || !clientKey) {
    return json({
      error: "Server configuration is incomplete.",
      code: "SERVER_CONFIGURATION_INVALID",
    }, 500);
  }
  const client = createClient(supabaseUrl, clientKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) {
    return json({
      error: "Invalid or expired session.",
      code: "INVALID_SESSION",
    }, 401);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 100_000) {
    return json({
      error: "Request body is too large.",
      code: "REQUEST_TOO_LARGE",
    }, 413);
  }
  const rawBody = await request.text();
  if (rawBody.length > 100_000) {
    return json({
      error: "Request body is too large.",
      code: "REQUEST_TOO_LARGE",
    }, 413);
  }
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON body.", code: "INVALID_JSON" }, 400);
  }
  if (
    !isRecord(body) || typeof body.action !== "string" ||
    !actions.includes(body.action as AIAction)
  ) {
    return json(
      { error: "Unsupported AI action.", code: "UNSUPPORTED_ACTION" },
      400,
    );
  }

  const action = body.action as AIAction;
  try {
    let payload = validatePayload(action, body.payload);
    const selectedProvider = configuredProvider();

    const { data: profile, error: profileError } = await client.from("profiles")
      .select(
        "first_name,last_name,current_job_title,years_of_experience,career_goal,skills,city,country",
      )
      .eq("id", userData.user.id).maybeSingle();
    if (profileError) {
      throw new PublicFunctionError(
        "PROFILE_CONTEXT_FAILED",
        "Your profile context could not be loaded.",
        500,
      );
    }
    payload = {
      ...payload,
      profile: sanitizedProfile(isRecord(profile) ? profile : null),
    };

    const documentId = typeof payload.documentId === "string"
      ? payload.documentId
      : null;
    const applicationId = typeof payload.applicationId === "string"
      ? payload.applicationId
      : null;
    const sessionId = typeof payload.sessionId === "string"
      ? payload.sessionId
      : null;

    if (documentId) {
      const { data: document, error } = await client.from("documents")
        .select("id,name,storage_path,mime_type,size_bytes,document_type")
        .eq("id", documentId).eq("user_id", userData.user.id).maybeSingle();
      if (error || !document) {
        throw new PublicFunctionError(
          "DOCUMENT_NOT_FOUND",
          "The selected resume is unavailable.",
          404,
        );
      }
      if (document.document_type && document.document_type !== "RESUME") {
        throw new RequestValidationError("Choose a resume document.");
      }
      const expectedPrefix = `users/${userData.user.id}/`;
      if (
        typeof document.storage_path !== "string" ||
        !document.storage_path.startsWith(expectedPrefix)
      ) {
        throw new PublicFunctionError(
          "DOCUMENT_NOT_FOUND",
          "The selected resume is unavailable.",
          404,
        );
      }
      const { data: file, error: downloadError } = await client.storage.from(
        "jobtrack-documents",
      ).download(document.storage_path);
      if (downloadError || !file) {
        throw new DocumentContentError(
          "DOCUMENT_DOWNLOAD_FAILED",
          "The selected resume could not be downloaded. Please upload it again and retry.",
        );
      }
      const extracted = await extractResumeText({
        name: document.name,
        mimeType: document.mime_type,
        declaredSize: document.size_bytes,
      }, new Uint8Array(await file.arrayBuffer()));
      payload = {
        ...payload,
        document: {
          id: document.id,
          name: document.name,
          mimeType: document.mime_type,
          format: extracted.format,
          characterCount: extracted.characterCount,
          text: extracted.text,
        },
      };
    }

    if (applicationId) {
      const { data: application, error } = await client.from("applications")
        .select(
          "id,company_name,job_title,job_description,location,work_mode,employment_type,notes",
        )
        .eq("id", applicationId).eq("user_id", userData.user.id).maybeSingle();
      if (error || !application) {
        throw new PublicFunctionError(
          "APPLICATION_NOT_FOUND",
          "The selected application is unavailable.",
          404,
        );
      }
      payload = { ...payload, application };
    }

    if (sessionId) {
      let query = client.from("ai_interview_sessions").select(
        "id,interview_type,difficulty,status",
      ).eq(
        "id",
        sessionId,
      ).eq("user_id", userData.user.id);
      if (applicationId) query = query.eq("application_id", applicationId);
      const { data: session, error } = await query.maybeSingle();
      if (error || !session) {
        throw new PublicFunctionError(
          "INTERVIEW_SESSION_NOT_FOUND",
          "The interview session is unavailable.",
          404,
        );
      }
      if (session.status !== "ACTIVE") {
        throw new PublicFunctionError(
          "INTERVIEW_SESSION_NOT_ACTIVE",
          "This interview session is no longer active. Start a new practice session.",
          409,
        );
      }
      payload = {
        ...payload,
        interviewType: session.interview_type,
        difficulty: session.difficulty,
      };
      if (action === "interview_question") {
        const {
          data: questionMessages,
          error: historyError,
          count: questionCount,
        } = await client
          .from("ai_interview_messages")
          .select("content", { count: "exact" })
          .eq("session_id", sessionId)
          .eq("user_id", userData.user.id)
          .eq("role", "ASSISTANT")
          .order("created_at", { ascending: false })
          .limit(20);
        if (historyError) {
          throw new PublicFunctionError(
            "INTERVIEW_HISTORY_FAILED",
            "The interview question history could not be loaded. Please try again.",
            500,
          );
        }
        const persistedQuestions = (questionMessages || []).flatMap((message) =>
          typeof message.content === "string" && message.content.trim()
            ? [message.content.trim().slice(0, 4_000)]
            : []
        ).reverse();
        payload = {
          ...payload,
          previousQuestions: persistedQuestions,
          questionNumber: questionCount ?? persistedQuestions.length,
        };
      }
    }

    const result = validateResult(
      action,
      await selectedProvider.execute(action, payload),
    );
    if (
      action === "interview_question" &&
      isRepeatedInterviewQuestion(
        String(result.question),
        interviewQuestionHistory(payload),
      )
    ) {
      throw new PublicFunctionError(
        "INTERVIEW_QUESTION_REPEATED",
        "A new interview question could not be generated. Please try again.",
        502,
      );
    }
    if (action === "resume_analysis" && documentId) {
      const { error } = await client.from("resume_analyses").insert({
        user_id: userData.user.id,
        document_id: documentId,
        overall_score: result.overallScore,
        ats_score: result.atsCompatibility,
        impact_score: result.impact,
        keywords_score: result.keywords,
        readability_score: result.readability,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        missing_keywords: result.missingKeywords,
        recommendations: result.recommendations,
        provider: selectedProvider.name,
      });
      if (error) throw new AnalysisPersistenceError();
    }
    if (action === "job_match" && documentId && applicationId) {
      const { error } = await client.from("job_match_analyses").insert({
        user_id: userData.user.id,
        document_id: documentId,
        application_id: applicationId,
        overall_match: result.overallMatch,
        skills_match: result.skillsMatch,
        experience_match: result.experienceMatch,
        education_match: result.educationMatch,
        keywords_match: result.keywordsMatch,
        matched_skills: result.matchedSkills,
        missing_skills: result.missingSkills,
        important_keywords: result.importantKeywords,
        recommended_changes: result.recommendedChanges,
        provider: selectedProvider.name,
      });
      if (error) throw new AnalysisPersistenceError();
    }
    return json({ result, provider: selectedProvider.name });
  } catch (error) {
    const safeError = error instanceof PublicFunctionError
      ? error
      : new PublicFunctionError(
        "AI_SERVICE_FAILED",
        "The AI service is temporarily unavailable. Please try again.",
        503,
      );
    console.error("ai-career failure", {
      name: error instanceof Error ? error.name : "UnknownError",
      code: safeError.code,
    });
    return json(
      { error: safeError.publicMessage, code: safeError.code },
      safeError.status,
    );
  }
});
