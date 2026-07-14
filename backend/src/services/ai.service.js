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

// Low-level call to the configured OpenAI-compatible chat endpoint (Grok by default).
async function chatComplete(prompt, { temperature = 0.4 } = {}) {
  if (!env.aiApiKey) {
    throw new ApiError(503, "AI suggestions are not configured (missing AI_API_KEY)");
  }

  const res = await fetch(`${env.aiBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.aiApiKey}`,
    },
    body: JSON.stringify({
      model: env.aiModel,
      messages: [{ role: "user", content: prompt }],
      temperature,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(502, `AI provider error (${res.status}): ${text.slice(0, 300)}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content?.trim();
  if (!content) throw new ApiError(502, "AI provider returned an empty response");
  return content;
}

// Formats a patient's past consultations into a compact, date-wise block of
// text for the prompt — most recent visit first.
function formatHistoryForPrompt(consultations) {
  return consultations
    .map((c) => {
      const items = (c.prescriptions ?? []).flatMap((p) => p.items ?? []);
      const meds = items.map((i) => [i.medicine, i.dosage].filter(Boolean).join(" ")).join(", ");
      return [
        `Date: ${new Date(c.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`,
        `Disease: ${c.disease || "not recorded"}`,
        `Symptoms: ${c.symptoms || "not recorded"}`,
        `Prescription: ${meds || "none"}`,
        `Notes: ${c.additionalNote || "none"}`,
      ].join("\n");
    })
    .join("\n\n");
}

// Side-panel AI summary shown as soon as a patient's name comes up in the
// doctor's queue.
//  - New patient (no consultation history): a quick "first impression" —
//    a probable/normal disease name, how the patient is likely feeling, and
//    what a normal report might look like, based only on the intake
//    description recorded by reception.
//  - Returning patient: a date-wise, ChatGPT-style recap of every past visit
//    (disease, prescription, brief note), plus a one-line "last treatment"
//    summary — kept short so it's genuinely quick to read between patients.
async function generatePatientSummary({ patient, consultations }) {
  const isNew = !consultations || consultations.length === 0;

  if (isNew) {
    const prompt = `You are a clinical assistant giving a doctor a 5-second first impression of a NEW patient, before the consultation starts.

Patient name: ${patient.name}
Intake description (from reception): ${patient.description || "not provided"}
Condition level flagged at intake: ${patient.conditionLevel || "LOW"}

This patient has no visit history. Based only on the above, write a short first-impression note for the doctor's side panel, plain text, no markdown symbols, using exactly these three lines:
Likely area of concern: <a plausible, general disease/condition name based on the description — say "insufficient information" if the description is too vague>
Patient likely feeling: <1 short sentence, empathetic and plain>
What a normal report looks like: <1 short sentence on what a routine/baseline finding would be for this kind of complaint>
Keep the whole thing under 60 words total. No disclaimers, no preamble, no "as an AI" language — the doctor already knows this is a suggestion, not a diagnosis.`;
    const summary = await chatComplete(prompt, { temperature: 0.4 });
    return { isNew: true, summary };
  }

  const history = formatHistoryForPrompt(consultations);
  const prompt = `You are a clinical assistant preparing a quick recap for a doctor about to see a RETURNING patient.

Patient name: ${patient.name}
Visit history, most recent first:

${history}

Write a short, date-wise recap in plain text (no markdown symbols like ** or ##, use simple "-" bullets), most recent visit first. For each visit show the date, disease/diagnosis, and prescription given, in minimal words. After the visit list, add exactly these two closing lines:
Last treatment: <one short line summarising the most recent treatment>
Overview: <one short line on the overall pattern across visits, e.g. recurring issue, improving, new complaint>
Keep the ENTIRE response under 150 words. No disclaimers, no preamble — just the recap.`;
  const summary = await chatComplete(prompt, { temperature: 0.3 });
  return { isNew: false, summary };
}

module.exports = { analysePrescription, generatePatientSummary };