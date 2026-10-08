// Thin client for the Grok (xAI) chat-completions API (OpenAI-compatible).
export const grokEnabled = () => Boolean(process.env.GROK_API_KEY);

export async function chat(messages, { temperature = 0.4, maxTokens = 900 } = {}) {
  const base = process.env.GROK_BASE_URL || 'https://api.x.ai/v1';
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROK_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.GROK_MODEL || 'grok-3',
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Grok API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

export function parseJsonLoose(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object in model output');
  return JSON.parse(text.slice(start, end + 1));
}
