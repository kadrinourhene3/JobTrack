import type { JsonObject } from "./types.ts";

export type MockInterviewQuestion = { question: string; focus: string };

type InterviewContext = {
  role: string;
  company: string;
  interviewType: string;
  difficulty: string;
};

type QuestionTopic = readonly [topic: string, focus: string];

const stopWords = new Set([
  "about",
  "after",
  "before",
  "could",
  "describe",
  "explain",
  "interview",
  "question",
  "role",
  "their",
  "there",
  "these",
  "through",
  "what",
  "when",
  "where",
  "which",
  "with",
  "would",
  "your",
]);

function isRecord(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function interviewContext(payload: JsonObject): InterviewContext {
  const application = isRecord(payload.application) ? payload.application : {};
  return {
    role: nonEmptyString(application.job_title, "this role"),
    company: nonEmptyString(application.company_name, "the company"),
    interviewType: nonEmptyString(payload.interviewType, "Technical Interview"),
    difficulty: nonEmptyString(payload.difficulty, "INTERMEDIATE")
      .toUpperCase(),
  };
}

function framedQuestion(
  context: InterviewContext,
  topic: string,
  category: "technical" | "behavioral" | "system" | "culture",
): string {
  const lead = category === "behavioral"
    ? context.difficulty === "BEGINNER"
      ? "describe a clear example of"
      : context.difficulty === "ADVANCED"
      ? "analyze a complex example of"
      : "walk through a specific example of"
    : category === "culture"
    ? context.difficulty === "BEGINNER"
      ? "explain your approach to"
      : context.difficulty === "ADVANCED"
      ? "show how you would lead through"
      : "describe how you would handle"
    : context.difficulty === "BEGINNER"
    ? "explain the fundamentals of"
    : context.difficulty === "ADVANCED"
    ? "design and defend an approach to"
    : "walk through your approach to";
  return `For the ${context.role} role at ${context.company}, ${lead} ${topic}?`;
}

function technicalTopics(role: string): QuestionTopic[] {
  const normalizedRole = role.toLowerCase();
  if (/mobile|react native|ios|android/.test(normalizedRole)) {
    return [
      [
        "structuring a React Native application and isolating platform-specific code",
        "Mobile architecture",
      ],
      [
        "choosing state management for a growing mobile application",
        "State management trade-offs",
      ],
      [
        "integrating authenticated APIs while handling retries and failures",
        "API integration and resilience",
      ],
      [
        "finding and fixing a mobile performance regression",
        "Performance diagnosis",
      ],
      [
        "debugging an issue that only appears on a physical device",
        "Production debugging",
      ],
      [
        "handling meaningful differences between iOS and Android",
        "Cross-platform engineering",
      ],
      [
        "protecting authentication tokens and sensitive mobile data",
        "Mobile security",
      ],
      [
        "supporting offline work and synchronizing changes safely",
        "Offline data and synchronization",
      ],
      [
        "testing a mobile feature across unit, integration, and device levels",
        "Mobile testing strategy",
      ],
      [
        "defining module boundaries and dependencies in a maintainable application",
        "Application architecture",
      ],
      [
        "shipping a reliable release through the App Store and Play Store",
        "Deployment and release safety",
      ],
      [
        "measuring and improving startup time, rendering, and memory usage",
        "Performance optimization",
      ],
    ];
  }
  if (/front.?end|web|ui/.test(normalizedRole)) {
    return [
      [
        "structuring a maintainable component architecture",
        "Frontend architecture",
      ],
      [
        "choosing state management and server-state boundaries",
        "State management trade-offs",
      ],
      [
        "building accessible interfaces across browsers and input methods",
        "Accessibility",
      ],
      [
        "diagnosing rendering and interaction performance regressions",
        "Web performance",
      ],
      [
        "integrating authenticated APIs and handling partial failures",
        "API integration",
      ],
      [
        "testing components, user flows, and browser compatibility",
        "Frontend testing",
      ],
      [
        "protecting the application against common browser security risks",
        "Web security",
      ],
      [
        "designing resilient loading, empty, and error states",
        "Interface resilience",
      ],
    ];
  }
  if (/back.?end|api|server|platform/.test(normalizedRole)) {
    return [
      ["designing clear service and module boundaries", "Backend architecture"],
      [
        "building an idempotent API that handles retries safely",
        "API reliability",
      ],
      [
        "selecting database indexes and validating query performance",
        "Database performance",
      ],
      [
        "protecting authentication, authorization, and sensitive data",
        "Backend security",
      ],
      [
        "handling asynchronous work and failure recovery",
        "Distributed processing",
      ],
      [
        "testing services across unit, integration, and contract levels",
        "Backend testing",
      ],
      [
        "observing and debugging a production latency regression",
        "Production diagnostics",
      ],
      ["deploying a backwards-compatible service change", "Safe deployment"],
    ];
  }
  if (/data|machine learning|\bml\b|analytics|scientist/.test(normalizedRole)) {
    return [
      [
        "designing a reproducible data or model pipeline",
        "Pipeline architecture",
      ],
      [
        "validating data quality and preventing silent regressions",
        "Data quality",
      ],
      [
        "selecting evaluation metrics that reflect the real objective",
        "Evaluation strategy",
      ],
      [
        "handling drift, monitoring, and production feedback",
        "Production monitoring",
      ],
      [
        "communicating uncertainty and trade-offs to stakeholders",
        "Technical communication",
      ],
      ["testing transformations and analytical assumptions", "Data testing"],
      ["protecting sensitive data throughout the workflow", "Data security"],
      ["improving the performance and cost of a large workload", "Scalability"],
    ];
  }
  return [
    [
      "breaking a complex feature into maintainable components",
      "Application architecture",
    ],
    [
      "integrating an external API while handling failures",
      "Integration design",
    ],
    ["diagnosing a production performance regression", "Performance diagnosis"],
    ["protecting authentication and sensitive user data", "Security"],
    ["choosing an effective automated testing strategy", "Testing"],
    ["reviewing a difficult technical trade-off", "Engineering judgment"],
    ["shipping a backwards-compatible production change", "Release safety"],
    ["observing and debugging a distributed failure", "Production debugging"],
  ];
}

export function mockInterviewQuestionBank(
  payload: JsonObject,
): MockInterviewQuestion[] {
  const context = interviewContext(payload);
  const type = context.interviewType.toLowerCase();
  const category = type.includes("system")
    ? "system"
    : type.includes("behavior")
    ? "behavioral"
    : type.includes("culture")
    ? "culture"
    : "technical";

  const topics: QuestionTopic[] = category === "technical"
    ? technicalTopics(context.role)
    : category === "system"
    ? [
      [
        "a scalable mobile architecture with clear client and backend boundaries",
        "End-to-end system design",
      ],
      [
        "an offline-first data model with conflict resolution",
        "Offline system design",
      ],
      [
        "a secure authentication and session-management system",
        "Security architecture",
      ],
      [
        "a notification system that remains reliable at scale",
        "Event-driven design",
      ],
      [
        "an observability strategy for diagnosing production mobile failures",
        "Observability",
      ],
      [
        "a media upload pipeline for unreliable mobile networks",
        "Storage and networking",
      ],
      [
        "a gradual rollout and feature-flag system for mobile releases",
        "Release architecture",
      ],
      [
        "a caching strategy that balances freshness, speed, and device storage",
        "Caching trade-offs",
      ],
    ]
    : category === "behavioral"
    ? [
      [
        "resolving a difficult technical disagreement with a teammate",
        "Conflict and collaboration",
      ],
      [
        "taking ownership of a project whose requirements were unclear",
        "Ownership under ambiguity",
      ],
      [
        "responding to a production incident or serious customer issue",
        "Accountability",
      ],
      [
        "changing direction after receiving challenging feedback",
        "Growth and adaptability",
      ],
      [
        "prioritizing competing deadlines without sacrificing quality",
        "Prioritization",
      ],
      ["influencing a decision without formal authority", "Influence"],
      [
        "learning an unfamiliar technology to deliver an important outcome",
        "Learning agility",
      ],
      ["improving a process for your wider team", "Team impact"],
    ]
    : [
      [
        "building trust with teammates whose working styles differ from yours",
        "Collaboration style",
      ],
      ["giving and receiving constructive feedback", "Feedback culture"],
      [
        "balancing speed, craftsmanship, and customer impact",
        "Judgment and values",
      ],
      ["supporting an inclusive engineering environment", "Inclusion"],
      [
        "making a decision when the available information is incomplete",
        "Decision-making",
      ],
      ["recovering constructively from a mistake", "Learning mindset"],
      [
        "communicating risk to technical and non-technical partners",
        "Transparent communication",
      ],
      ["contributing beyond your assigned tasks", "Team contribution"],
    ];

  return topics.map(([topic, focus]) => ({
    question: framedQuestion(context, topic, category),
    focus:
      `Development practice · ${focus} · ${context.difficulty.toLowerCase()} level`,
  }));
}

export function normalizeInterviewQuestion(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function interviewQuestionHistory(payload: JsonObject): string[] {
  const history = Array.isArray(payload.previousQuestions)
    ? payload.previousQuestions.filter((value): value is string =>
      typeof value === "string" && Boolean(value.trim())
    ).map((value) => value.trim())
    : [];
  if (
    typeof payload.previousQuestion === "string" &&
    payload.previousQuestion.trim()
  ) {
    const current = payload.previousQuestion.trim();
    if (
      !history.length ||
      normalizeInterviewQuestion(history[history.length - 1]) !==
        normalizeInterviewQuestion(current)
    ) {
      history.push(current);
    }
  }
  return history;
}

export function isRepeatedInterviewQuestion(
  question: string,
  history: readonly string[],
): boolean {
  const normalized = normalizeInterviewQuestion(question);
  return history.some((previous) =>
    normalizeInterviewQuestion(previous) === normalized
  );
}

export function selectMockInterviewQuestion(
  payload: JsonObject,
): MockInterviewQuestion {
  const bank = mockInterviewQuestionBank(payload);
  const history = interviewQuestionHistory(payload);
  const asked = new Set(history.map(normalizeInterviewQuestion));
  const questionNumber = typeof payload.questionNumber === "number" &&
      Number.isSafeInteger(payload.questionNumber) &&
      payload.questionNumber >= 0
    ? payload.questionNumber
    : history.length;
  const startIndex = questionNumber % bank.length;

  for (let offset = 0; offset < bank.length; offset += 1) {
    const candidate = bank[(startIndex + offset) % bank.length];
    if (!asked.has(normalizeInterviewQuestion(candidate.question))) {
      return candidate;
    }
  }

  const lastQuestion = history.at(-1) || "";
  for (let offset = 0; offset < bank.length; offset += 1) {
    const candidate = bank[(startIndex + offset) % bank.length];
    if (
      normalizeInterviewQuestion(candidate.question) !==
        normalizeInterviewQuestion(lastQuestion)
    ) {
      return candidate;
    }
  }
  return bank[0];
}

function words(value: string): string[] {
  return value.toLowerCase().match(/[\p{L}\p{N}+#.-]+/gu) || [];
}

function boundedScore(value: number): number {
  return Math.max(1, Math.min(10, Math.round(value)));
}

export function mockInterviewFeedback(payload: JsonObject): JsonObject {
  const context = interviewContext(payload);
  const answer = nonEmptyString(payload.answer, "");
  const question = nonEmptyString(payload.question, "the interview question");
  const answerWords = words(answer);
  const answerSet = new Set(answerWords);
  const contextWords = [...words(question), ...words(context.role)].filter((
    word,
  ) => word.length > 3 && !stopWords.has(word));
  const relevanceHits =
    new Set(contextWords.filter((word) => answerSet.has(word))).size;
  const hasStructure =
    /\b(situation|task|action|result|first|then|finally|outcome)\b/i.test(
      answer,
    );
  const hasEvidence =
    /\d|%|\b(metric|measured|increased|reduced|improved|saved|grew)\b/i.test(
      answer,
    );
  const detailed = answerWords.length >= 40;
  const concise = answerWords.length <= 180;

  const clarity = boundedScore(
    4 + (detailed ? 2 : 0) + (concise ? 1 : 0) + (hasStructure ? 1 : 0),
  );
  const relevance = boundedScore(
    4 + Math.min(3, relevanceHits) + (detailed ? 1 : 0),
  );
  const structure = boundedScore(
    4 + (hasStructure ? 3 : 0) + (detailed ? 1 : 0),
  );
  const impact = boundedScore(
    4 + (hasEvidence ? 3 : 0) + (relevanceHits > 0 ? 1 : 0),
  );

  const strengths: string[] = [];
  if (detailed) {
    strengths.push(
      "The answer provides enough detail to evaluate your contribution.",
    );
  }
  if (relevanceHits > 0) {
    strengths.push(
      `The answer connects its evidence to the ${context.role} discussion.`,
    );
  }
  if (hasStructure) {
    strengths.push("The sequence of events and actions is easy to follow.");
  }
  if (hasEvidence) {
    strengths.push("Concrete evidence makes the outcome more credible.");
  }
  if (!strengths.length) {
    strengths.push(
      "The answer establishes a useful starting point for a stronger response.",
    );
  }

  const improvements: string[] = [];
  if (!hasStructure) {
    improvements.push(
      "Organize the response into situation, action, and result.",
    );
  }
  if (!hasEvidence) {
    improvements.push(
      "Add a measurable outcome or another concrete indicator of impact.",
    );
  }
  if (relevanceHits === 0) {
    improvements.push(
      `Connect the example more directly to the ${context.role} role and the question asked.`,
    );
  }
  if (!detailed) {
    improvements.push(
      "Clarify your individual decisions and contribution with one or two specific details.",
    );
  }
  if (!improvements.length) {
    improvements.push(
      `Make the relevance to ${context.company} explicit in the closing result.`,
    );
  }

  const guidance = !hasStructure
    ? `For this ${context.interviewType.toLowerCase()} response, lead with the situation, explain your own actions, and close with the result.`
    : !hasEvidence
    ? `Strengthen this ${context.role} example by adding a measurable result and explaining why it mattered.`
    : relevanceHits === 0
    ? `Tie your evidence back to the specific question and the ${context.role} responsibilities at ${context.company}.`
    : `Keep this structure, then sharpen the final sentence to connect your result to the ${context.role} role at ${context.company}.`;
  const suggestion = `Development practice feedback: ${guidance}`;

  return {
    clarity,
    relevance,
    structure,
    impact,
    suggestion,
    strengths,
    improvements,
  };
}
