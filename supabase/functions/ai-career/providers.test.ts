import { MockModeError } from "./errors.ts";
import { MockAIProvider, OpenAIProvider } from "./providers.ts";
import type { JsonObject } from "./types.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function contentAwareFetcher(capturedInputs: string[]): typeof fetch {
  return ((
    _input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const body = JSON.parse(String(init?.body)) as JsonObject;
    const input = String(body.input);
    capturedInputs.push(input);
    const mobile = input.includes("React Native") && input.includes("Supabase");
    const result = mobile
      ? {
        overallScore: 84,
        atsCompatibility: 82,
        impact: 79,
        keywords: 88,
        readability: 86,
        strengths: ["Strong React Native and Supabase delivery evidence."],
        weaknesses: ["Quantify mobile performance outcomes."],
        missingKeywords: ["mobile accessibility"],
        recommendations: ["Add measured iOS and Android outcomes."],
      }
      : {
        overallScore: 77,
        atsCompatibility: 75,
        impact: 81,
        keywords: 90,
        readability: 80,
        strengths: ["Clear Python, machine learning, and XGBoost experience."],
        weaknesses: ["Clarify production model scale."],
        missingKeywords: ["feature store"],
        recommendations: [
          "Add model monitoring metrics and experiment impact.",
        ],
      };
    return Promise.resolve(
      new Response(
        JSON.stringify({
          output: [{
            type: "message",
            content: [{ type: "output_text", text: JSON.stringify(result) }],
          }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  }) as typeof fetch;
}

Deno.test("OpenAI provider receives resume content and produces content-dependent results", async () => {
  const capturedInputs: string[] = [];
  const provider = new OpenAIProvider(
    "server-secret",
    "configured-model",
    contentAwareFetcher(capturedInputs),
  );
  const mobile = await provider.execute("resume_analysis", {
    document: {
      text:
        "React Native TypeScript Supabase developer delivering secure iOS and Android applications.",
    },
    profile: {},
  });
  const data = await provider.execute("resume_analysis", {
    document: {
      text:
        "Data Scientist using Python machine learning XGBoost experiments and statistical modeling.",
    },
    profile: {},
  });
  assert(
    capturedInputs[0].includes("React Native TypeScript Supabase"),
    "Resume A text did not reach the provider request.",
  );
  assert(
    capturedInputs[1].includes("Python machine learning XGBoost"),
    "Resume B text did not reach the provider request.",
  );
  assert(
    mobile.overallScore !== data.overallScore,
    "Expected content-dependent scores.",
  );
  assert(
    JSON.stringify(mobile.strengths) !== JSON.stringify(data.strengths),
    "Expected content-dependent strengths.",
  );
  assert(
    JSON.stringify(mobile.recommendations) !==
      JSON.stringify(data.recommendations),
    "Expected content-dependent recommendations.",
  );
  assert(
    JSON.stringify(mobile.missingKeywords) !==
      JSON.stringify(data.missingKeywords),
    "Expected content-dependent keywords.",
  );
});

Deno.test("mock mode refuses realistic career analysis", async () => {
  const provider = new MockAIProvider();
  let rejected = false;
  try {
    await provider.execute("resume_analysis", {
      document: {
        text: "A real resume body that must not receive mock ATS scores.",
      },
    });
  } catch (error) {
    rejected = error instanceof MockModeError;
  }
  assert(rejected, "Expected mock mode to reject ATS analysis.");
});

Deno.test("OpenAI interview request receives complete previous-question context", async () => {
  let capturedInput = "";
  const fetcher = ((
    _input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const request = JSON.parse(String(init?.body)) as JsonObject;
    capturedInput = String(request.input);
    return Promise.resolve(
      new Response(
        JSON.stringify({
          output: [{
            type: "message",
            content: [{
              type: "output_text",
              text: JSON.stringify({
                question:
                  "How would you diagnose a mobile performance regression?",
                focus: "Performance diagnosis",
              }),
            }],
          }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
  }) as typeof fetch;
  const provider = new OpenAIProvider(
    "server-secret",
    "configured-model",
    fetcher,
  );

  await provider.execute("interview_question", {
    application: { job_title: "Mobile developer", company_name: "Meta" },
    interviewType: "Technical Interview",
    difficulty: "INTERMEDIATE",
    previousQuestions: [
      "How would you structure a React Native application?",
      "How would you choose a state-management approach?",
    ],
  });

  assert(
    capturedInput.includes("previousQuestions"),
    "The provider request omitted session history.",
  );
  assert(
    capturedInput.includes("structure a React Native"),
    "The first previous question was omitted.",
  );
  assert(
    capturedInput.includes("state-management"),
    "The second previous question was omitted.",
  );
  assert(
    capturedInput.includes("Mobile developer"),
    "The provider request omitted role context.",
  );
  assert(
    capturedInput.includes("Meta"),
    "The provider request omitted company context.",
  );
});
