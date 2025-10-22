// Netlify Function: /.netlify/functions/recommend
// Talks to OpenAI and returns JSON book recommendations.

import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = "gpt-4o-mini"; // fast & cost-efficient

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { destination = "", locale = "" } = JSON.parse(event.body || "{}");
    if (!destination.trim()) {
      return { statusCode: 400, body: "Missing 'destination'" };
    }

    // Pick Amazon domain based on locale/country
    const country = (locale || event.headers["x-country"] || "").toUpperCase();
    const amazonDomain =
      country.startsWith("UK") || country === "GB" ? "amazon.co.uk" :
      country === "DE" ? "amazon.de" :
      country === "FR" ? "amazon.fr" :
      country === "CA" ? "amazon.ca" :
      country === "AU" ? "amazon.com.au" :
      "amazon.com";

    const system = `You are NomadReads, a travel-lit recommender.
Return STRICT JSON only with this shape:
{
  "destination": string,
  "categories": [
    {"name":"Romance","books":[{ "title":string,"author":string,"why":string,"isbn13":string? }]},
    {"name":"Mystery & Thriller","books":[...]},
    {"name":"Historical Fiction","books":[...]},
    {"name":"Other Suggestions","books":[...]}
  ]
}
Rules:
- 3 books per category (exactly).
- Prefer works tied to the place (setting, author, or theme).
- "why" ≤ 30 words, specific to the place.
- JSON only, no extra text.`;

    const user = `Destination: ${destination}`;

    const resp = await client.responses.create({
      model: MODEL,
      temperature: 0.6,
      response_format: { type: "json_object" },
      input: [
        { role: "system", content: system },
        { role: "user", content: user }
      ],
    });

    const text = resp.output_text;
    const data = JSON.parse(text);

    // Add Amazon search links
    const withLinks = {
      ...data,
      categories: data.categories.map(cat => ({
        ...cat,
        books: cat.books.map(b => {
          const q = encodeURIComponent(`${b.title} ${b.author}`);
          const base = `https://${amazonDomain}/s?k=${q}`;
          return {
            ...b,
            links: {
              paperback: base + "+paperback",
              kindle: base + "+kindle",
              audio: base + "+audiobook"
            }
          };
        })
      }))
    };

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withLinks)
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: "Recommendation error" };
  }
}
