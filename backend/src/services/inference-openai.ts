const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

export async function inferOpenAI(
  prompt: string,
  opts?: { model?: string; maxTokens?: number; system?: string }
) {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

  const model = opts?.model || "gpt-4o-mini";
  const messages: any[] = [];
  if (opts?.system) messages.push({ role: "system", content: opts.system });
  messages.push({ role: "user", content: prompt });

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: opts?.maxTokens || 500 }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as any;
  const choice = data.choices?.[0];

  return {
    response: choice?.message?.content || "",
    model: data.model,
    provider: "openai",
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
  };
}
