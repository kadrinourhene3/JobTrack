export type InterviewQuestionTransition<TFeedback> = {
  applicationId: string;
  sessionId: string;
  question: string;
  answer: string;
  feedback: TFeedback | null;
  retryNextQuestion: boolean;
};

export function prepareNextQuestion<TFeedback>(
  state: InterviewQuestionTransition<TFeedback>,
): InterviewQuestionTransition<TFeedback> {
  return { ...state, answer: '', feedback: null, retryNextQuestion: true };
}
