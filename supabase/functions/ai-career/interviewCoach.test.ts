import {
  interviewQuestionHistory,
  mockInterviewFeedback,
  mockInterviewQuestionBank,
  selectMockInterviewQuestion,
} from "./interviewCoach.ts";
import { prepareNextQuestion } from "../../../src/utils/interviewCoachState.ts";
import type { JsonObject } from "./types.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const technicalPayload: JsonObject = {
  sessionId: "00000000-0000-4000-8000-000000000001",
  interviewType: "Technical Interview",
  difficulty: "INTERMEDIATE",
  application: {
    job_title: "Mobile developer",
    company_name: "Meta",
  },
};

Deno.test("mock interview progresses through three distinct contextual questions", () => {
  const first = selectMockInterviewQuestion(technicalPayload);
  const second = selectMockInterviewQuestion({
    ...technicalPayload,
    previousQuestions: [first.question],
  });
  const third = selectMockInterviewQuestion({
    ...technicalPayload,
    previousQuestions: [first.question, second.question],
  });

  assert(
    first.question.includes("Mobile developer"),
    "The first question must include the selected role.",
  );
  assert(
    first.question.includes("Meta"),
    "The first question must include the selected company.",
  );
  assert(
    first.focus.includes("Development practice"),
    "Mock questions must be identified as development practice.",
  );
  assert(
    first.question !== second.question,
    "The next question repeated the first question.",
  );
  assert(
    third.question !== first.question,
    "The third question repeated the first question.",
  );
  assert(
    third.question !== second.question,
    "The third question repeated the second question.",
  );
});

Deno.test("interview type and difficulty change the mock question category", () => {
  const technical = selectMockInterviewQuestion(technicalPayload);
  const behavioral = selectMockInterviewQuestion({
    ...technicalPayload,
    interviewType: "Behavioral Interview",
  });
  const advanced = selectMockInterviewQuestion({
    ...technicalPayload,
    difficulty: "ADVANCED",
  });

  assert(
    technical.question.includes("React Native"),
    "A mobile technical interview should use a mobile topic.",
  );
  assert(
    behavioral.question.includes("disagreement"),
    "A behavioral interview should use a behavioral topic.",
  );
  assert(
    technical.question !== behavioral.question,
    "Interview type did not affect the question.",
  );
  assert(
    advanced.question.includes("design and defend"),
    "Difficulty did not affect question framing.",
  );
});

Deno.test("mock question bank avoids all history until exhausted and never immediately repeats", () => {
  const bank = mockInterviewQuestionBank(technicalPayload);
  const history = bank.map((item) => item.question);
  const afterExhaustion = selectMockInterviewQuestion({
    ...technicalPayload,
    previousQuestions: history,
  });
  assert(
    afterExhaustion.question !== history.at(-1),
    "The exhausted question bank immediately repeated the current question.",
  );
});

Deno.test("question history combines persisted history and current-question fallback", () => {
  const history = interviewQuestionHistory({
    previousQuestions: ["Question one?", "Question two?"],
    previousQuestion: "Question two?",
  });
  assert(
    history.length === 2,
    "Question history should preserve the session and remove duplicates.",
  );
  assert(
    history[0] === "Question one?" && history[1] === "Question two?",
    "Question order changed.",
  );
});

Deno.test("mock feedback varies with answer evidence and remains contextual", () => {
  const shortFeedback = mockInterviewFeedback({
    ...technicalPayload,
    question: "How would you improve React Native performance?",
    answer: "I would inspect the application and make improvements.",
  });
  const evidencedFeedback = mockInterviewFeedback({
    ...technicalPayload,
    question: "How would you improve React Native performance?",
    answer:
      "The situation involved slow React Native rendering. First I measured startup, then reduced unnecessary renders, and finally improved startup by 35 percent. The result was a faster mobile experience.",
  });
  assert(
    JSON.stringify(shortFeedback) !== JSON.stringify(evidencedFeedback),
    "Different answers should not receive identical mock feedback.",
  );
  assert(
    JSON.stringify(evidencedFeedback).includes("Mobile developer"),
    "Feedback should retain selected-role context.",
  );
  assert(
    String(evidencedFeedback.suggestion).startsWith(
      "Development practice feedback:",
    ),
    "Mock feedback must be identified as development practice.",
  );
});

Deno.test("next-question state clears the answer and feedback while preserving the session", () => {
  const transition = prepareNextQuestion({
    applicationId: "application-1",
    sessionId: "session-1",
    question: "Current question?",
    answer: "A completed answer",
    feedback: { clarity: 8 },
    retryNextQuestion: false,
  });
  assert(transition.answer === "", "The previous answer was not cleared.");
  assert(
    transition.feedback === null,
    "The previous feedback was not cleared.",
  );
  assert(
    transition.applicationId === "application-1",
    "The selected application changed.",
  );
  assert(
    transition.sessionId === "session-1",
    "The interview session changed.",
  );
  assert(
    transition.question === "Current question?",
    "The current question context was lost.",
  );
  assert(
    transition.retryNextQuestion,
    "A failed next-question request would not remain retryable.",
  );
});
