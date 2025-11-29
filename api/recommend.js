export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // --- Safely read body, whether it's already parsed or still a string ---
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.error('Body parse error:', e, body);
        res.status(400).json({ error: 'Invalid JSON body' });
        return;
      }
    }

    const destination = body && body.destination;
    if (!destination) {
      res.status(400).json({ error: 'Destination is required' });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('Missing OPENAI_API_KEY');
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    const openaiRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input: `
You are a book concierge for travellers.

Suggest 3–4 books for the destination: "${destination}".

Return strict JSON with this structure, nothing else:

{
  "Romance": [
    {"title": "...", "author": "...", "why": "..."}
  ],
  "Mystery & Thriller": [
    {"title": "...", "author": "...", "why": "..."}
  ],
  "Historical Fiction": [
    {"title": "...", "author": "...", "why": "..."}
  ],
  "Other Suggestions": [
    {"title": "...", "author": "...", "why": "..."}
  ]
}
        `.trim(),
      }),
    });

    if (!openaiRes.ok) {
      const text = await openaiRes.text().catch(() => openaiRes.statusText);
      console.error('OpenAI error:', openaiRes.status, text);
      res.status(500).json({ error: 'OpenAI call failed' });
      return;
    }

    const data = await openaiRes.json();

    // Try to extract the JSON text from Responses API output
    let text = '';
    try {
      if (Array.isArray(data.output) &&
          data.output[0] &&
          data.output[0].content &&
          data.output[0].content[0] &&
          typeof data.output[0].content[0].text === 'string') {
        text = data.output[0].content[0].text;
      } else if (typeof data.output_text === 'string') {
        text = data.output_text;
      } else {
        text = JSON.stringify(data);
      }
    } catch (e) {
      console.error('Unexpected OpenAI response shape:', e, data);
      res.status(500).json({ error: 'Unexpected OpenAI response format' });
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.error('JSON parse error on AI text:', e, text);
      res.status(500).json({ error: 'Could not parse AI response' });
      return;
    }

    res.status(200).json({ recommendations: parsed });
  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
