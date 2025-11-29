export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { destination } = JSON.parse(req.body || '{}');

    if (!destination) {
      res.status(400).json({ error: 'Destination is required' });
      return;
    }

    const openaiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
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
        `
      })
    });

    if (!openaiRes.ok) {
      const text = await openaiRes.text();
      console.error('OpenAI error:', text);
      res.status(500).json({ error: 'OpenAI call failed' });
      return;
    }

    const data = await openaiRes.json();

    // The Responses API returns output in a "output[0].content[0].text" style structure.
    // We try to parse JSON from the text.
    const text = data.output[0].content[0].text || data.output_text || "";
    let parsed;

    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.error('JSON parse error:', e, text);
      res.status(500).json({ error: 'Could not parse AI response' });
      return;
    }

    res.status(200).json({ recommendations: parsed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}
