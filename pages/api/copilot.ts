import type { NextApiRequest, NextApiResponse } from 'next';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

const TANZIB_SYSTEM_PROMPT = `
You are the 24/7 Personal Strategic Design Co-Pilot for Tanzib Ul Alam.
Tanzib is an expert Graphic Designer based in Rajshahi, Bangladesh with 3+ years of experience.
Tools: Adobe Photoshop, Adobe Illustrator, Canva Pro.
Portfolio: https://drive.google.com/drive/folders/1UDsUcIsEEhv1isTU_DuQlGQEdMmQ7e3H
Contact: tanzibulalam5@gmail.com | WhatsApp: +880 1992796109

Tanzib's 4 Core Offerings:
1. Social Media Post & Ad Design (Carousels, promotional ads, banner campaigns)
2. Poster & Flyer Design (Event flyers, marketing posters, business one-pagers)
3. Book Cover Design (Kindle, Amazon KDP, print-ready paperbacks with spine/bleed)
4. Vector Tracing & Logo Redraw (Low-res to crisp vector AI/EPS/SVG)

Your Responsibilities:
- Draft compelling, non-generic client proposals highlighting Tanzib's portfolio and fast delivery.
- Handle client objections (budget pushbacks, revisions, deadlines) with confidence.
- Suggest strategic pricing tiers (single post vs 10-post retainer bundles).
- Keep communication punchy, professional, and client-centric. Never sound robotic or generic.
`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, leadContext, conversationHistory = [] } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  let enrichedPrompt = TANZIB_SYSTEM_PROMPT;
  if (leadContext) {
    enrichedPrompt += `\n\n--- ACTIVE LEAD IN FOCUS ---\nTitle: ${leadContext.title}\nCategory: ${leadContext.category || 'N/A'}\nBudget: ${leadContext.budget || 'Flexible'}\nPain: ${leadContext.pain || 'N/A'}\nOriginal Pitch: ${leadContext.proposal || 'N/A'}\nLink: ${leadContext.link}\n----------------------------`;
  }

  // 1. Primary: Gemini via Native REST (Zero npm dependency issues)
  if (GEMINI_API_KEY) {
    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${enrichedPrompt}\n\nClient Conversation History:\n${JSON.stringify(conversationHistory)}\n\nUser Question:\n${message}` }]
              }
            ]
          })
        }
      );

      const geminiData = await geminiRes.json();
      const reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) {
        return res.status(200).json({ reply, engine: 'Gemini 2.5 Flash' });
      }
    } catch (geminiErr) {
      console.warn('Gemini failover triggered:', geminiErr);
    }
  }

  // 2. Secondary: Groq LPU via Native REST
  if (GROQ_API_KEY) {
    try {
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: enrichedPrompt },
            ...conversationHistory.map((m: any) => ({
              role: m.role === 'assistant' ? 'assistant' : 'user',
              content: m.content
            })),
            { role: 'user', content: message }
          ],
          temperature: 0.3
        })
      });

      const groqData = await groqRes.json();
      const reply = groqData.choices?.[0]?.message?.content;
      if (reply) {
        return res.status(200).json({ reply, engine: 'Groq LPU' });
      }
    } catch (groqErr) {
      console.error('Groq failover error:', groqErr);
    }
  }

  return res.status(500).json({ error: 'AI processing failed. Please check GEMINI_API_KEY or GROQ_API_KEY in Vercel settings.' });
}
