export type AIAction =
  | "resume_analysis"
  | "job_match"
  | "tailor_resume"
  | "cover_letter"
  | "interview_question"
  | "interview_feedback";

export type JsonObject = Record<string, unknown>;

export interface AIProvider {
  readonly name: string;
  execute(
    action: AIAction,
    payload: JsonObject,
  ): Promise<JsonObject> | JsonObject;
}
