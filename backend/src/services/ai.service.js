const { env } = require("../config/env");
const { ApiError } = require("../utils/ApiError");

// Talks to any OpenAI-compatible chat-completions endpoint (OpenAI, Groq,
// OpenRouter, a local vLLM server, etc.) — configure via AI_BASE_URL / AI_MODEL.
async function analysePrescription({ symptoms, disease, cause, condition, patientDescription }) {
  if (!env.aiApiKey) {
    throw new ApiError(503, "AI suggestions are not configured (missing AI_API_KEY)");
  }

  const prompt = `You are a clinical decision-support assistant helping a licensed physician draft a prescription.
Patient information:
- Symptoms: ${symptoms || "(none provided)"}
- Suspected disease: ${disease || "(unspecified)"}
- Cause / condition: ${cause || "(unspecified)"} ${condition ? `/ ${condition}` : ""}
- Additional description: ${patientDescription || "(none)"}

Suggest 3-6 medications the doctor should CONSIDER. For each, output on its own line:
"<medicine> — <dosage> — <frequency> — <duration>"
Then a short "Notes:" line with 1-2 non-pharmacological recommendations.
Do NOT include disclaimers, refusals, or long preambles. Doctor will review and approve.`;

  const res = await fetch(`${env.aiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.aiApiKey}`,
    },
    body: JSON.stringify({
      model: env.aiModel,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(502, `AI provider error (${res.status}): ${text.slice(0, 300)}`);
  }

  const json = await res.json();
  const suggestion = json?.choices?.[0]?.message?.content?.trim();
  if (!suggestion) throw new ApiError(502, "AI provider returned an empty response");

  return suggestion;
}

module.exports = { analysePrescription };
