const GEMINI_API = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent';

// ── Shared fetch wrapper ─────────────────────────────────────────────────────
export async function callClaude(prompt, maxTokens = 800) {
  const res = await fetch(`${GEMINI_API}?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.1
      }
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.error?.message ?? 'Gemini API error'), { status: res.status });
  }

  const data = await res.json();
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  
  // Clean markdown out completely if present
  text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1) {
    // ── DIAGNOSTIC LOG ──
    console.log("⚠️ CRITICAL DEBUG: Raw response string from Gemini API was:", JSON.stringify(text));
    throw new Error('Model failed to output a valid structural JSON block.');
  }

  return text.slice(firstBrace, lastBrace + 1).trim();
}

// ── JD Auto-fill ─────────────────────────────────────────────────────────────
export async function parseJobDescription(jdText) {
  const prompt = `You are a strict automated parser. Analyze this job description text and output a flat JSON object matching this schema structure exactly:
{
  "company": "Company Name",
  "role": "Job Title",
  "salary_range": "Salary Info",
  "skills": "Skill1, Skill2",
  "employment_type": "Full-time",
  "location": "City or Remote"
}

CRITICAL RULES:
- Output only the JSON map object. Do not include markdown codeblocks. Do not include introductory text.
- If a value cannot be found, set its key value to "".

JOB DESCRIPTION TEXT:
${jdText}`;

  try {
    const raw = await callClaude(prompt, 2048);
    return JSON.parse(raw);
  } catch (error) {
    console.error("Auto-fill extraction failed inside service wrapper:", error);
    return { company: "Parsing Error", role: "Please look at terminal logs", salary_range: "", skills: "", employment_type: "", location: "" };
  }
}

// ── Resume Gap Analyser ───────────────────────────────────────────────────────
export async function analyseGap({ resumeText, company, role, notes }) {
  const prompt = `You are an expert recruiter. Compare the resume against the job requirements.
Return a JSON object matching this schema:
{
  "score": 5,
  "verdict": "Short match phrase",
  "summary": "One sentence summary evaluation.",
  "strengths": ["strength 1", "strength 2"],
  "gaps": ["gap 1", "gap 2"],
  "rewrites": [
    { "original": "resume text", "improved": "optimized text" }
  ]
}

RESUME:
${resumeText}

JOB: ${role} at ${company}
DESCRIPTION:
${notes ?? 'Not provided'}`;

  try {
    const raw = await callClaude(prompt, 1200);
    return JSON.parse(raw);
  } catch (error) {
    console.error("Gap Analysis failed:", error);
    return { score: null, verdict: "Analysis Error", summary: "Failed to compile metrics.", strengths: [], gaps: [], rewrites: [] };
  }
}