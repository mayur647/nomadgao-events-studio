import "server-only";

/** Keys from AI Studio start with "AIza"; Google Cloud (Vertex AI express) keys start with "AQ." and use a different host. */
export const isVertexKey = (key: string) => key.startsWith("AQ.");

export type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

export class GeminiError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

/** Ask Gemini for JSON matching `schema`. Tries the configured model, then sensible fallbacks. */
export async function geminiJSON<T>({ system, parts, schema, temperature = 0.4 }: { system: string; parts: Part[]; schema: object; temperature?: number }): Promise<{ data: T; model: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError("AI isn't set up yet. Add GEMINI_API_KEY in Vercel.", 503);
  const vertex = isVertexKey(key);
  const preferred = process.env.GEMINI_MODEL || (vertex ? "gemini-2.5-flash" : "gemini-flash-latest");
  const models = [...new Set([preferred, "gemini-2.5-flash", vertex ? "gemini-2.0-flash-001" : "gemini-2.0-flash"])];
  let last = "";
  for (const m of models) {
    const url = vertex
      ? `https://aiplatform.googleapis.com/v1/publishers/google/models/${m}:generateContent?key=${encodeURIComponent(key)}`
      : `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: vertex ? { "Content-Type": "application/json" } : { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts }],
          generationConfig: { temperature, responseMimeType: "application/json", responseSchema: schema },
        }),
      });
      const raw = await res.text();
      if (!res.ok) {
        last = raw.slice(0, 300);
        if (res.status === 429) throw new GeminiError("The free AI limit is used up for now. Try again in a minute.", 429);
        if (res.status === 404 || (res.status === 400 && /model|not found|not supported/i.test(raw))) continue;
        if (res.status === 400) throw new GeminiError(`AI couldn't read that: ${(JSON.parse(raw)?.error?.message ?? raw).slice(0, 200)}`, 400);
        continue;
      }
      const json = JSON.parse(raw);
      const text: string = json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
      if (!text) {
        last = json?.candidates?.[0]?.finishReason ?? "empty answer";
        continue;
      }
      return { data: JSON.parse(text) as T, model: m };
    } catch (e) {
      if (e instanceof GeminiError) throw e;
      last = (e as Error).message;
    }
  }
  throw new GeminiError(`AI request failed: ${last}`);
}
