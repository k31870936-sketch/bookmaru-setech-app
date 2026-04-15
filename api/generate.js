export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST만 허용됩니다.' }), { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API 키가 설정되지 않았습니다.' }), { status: 500 });
  }

  let body;
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: '잘못된 요청입니다.' }), { status: 400 }); }

  const { prompt, mode } = body;
  if (!prompt) {
    return new Response(JSON.stringify({ error: 'prompt가 없습니다.' }), { status: 400 });
  }

  const maxTokens = mode === 'full' ? 3000 : 1000;

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return new Response(
        JSON.stringify({ error: data.error?.message || 'Anthropic API 오류' }),
        { status: upstream.status }
      );
    }

    const text = data.content?.find(b => b.type === 'text')?.text || '';
    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
