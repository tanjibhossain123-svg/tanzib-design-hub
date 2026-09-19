import type { NextApiRequest, NextApiResponse } from 'next';

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  '';

const GROQ_API_KEY =
  process.env.GROQ_API_KEY ||
  process.env.NEXT_PUBLIC_GROQ_API_KEY ||
  '';

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

Tone: Professional, direct, persuasive, and value-focused. Never robotic or generic.
`;

function generateSmartFallback(message: string, leadContext: any): string {
  const lower = message.toLowerCase();
  const title = leadContext?.title || 'your design project';
  const category = leadContext?.category || 'Graphic Design';
  const portfolio = 'https://drive.google.com/drive/folders/1UDsUcIsEEhv1isTU_DuQlGQEdMmQ7e3H';

  if (lower.includes('pitch') || lower.includes('proposal') || lower.includes('fast pitch')) {
    return `Here is a high-converting 3-sentence proposal for "${title}":\n\n"Hi there! I saw your requirement for ${category} and would love to help bring your vision to life. With 3+ years of experience in Photoshop and Illustrator, I deliver crisp, production-ready designs with fast turnaround and unlimited revisions. You can view my recent work here: ${portfolio} — let's discuss your timeline!"`;
  }

  if (lower.includes('budget') || lower.includes('counter') || lower.includes('discount') || lower.includes('cheap')) {
    return `Here is how to counter a low-budget client professionally:\n\n"I completely respect your budget! To deliver the high visual polish your brand deserves, my standard rate for ${category} is typically higher. However, to match your current budget, I can offer [Option: e.g., 1 concept with 2 revision rounds instead of unlimited]. Alternatively, if you need ongoing work, we can bundle this into a monthly retainer for maximum cost savings. Would that work for you?"`;
  }

  if (lower.includes('retainer') || lower.includes('bundle') || lower.includes('monthly')) {
    return `Here is a 10-Post Monthly Social Media Retainer package pitch:\n\n"Instead of paying per individual graphic, I offer an ongoing Monthly Growth Retainer:\n• 10 High-converting posts or ads (Photoshop/Illustrator)\n• Formatted for Instagram, Facebook, and LinkedIn\n• Editable source files + 48h turnaround per asset\n• Dedicated priority revisions\n\nRate: Flexible depending on frequency. Check my portfolio: ${portfolio}. Let me know if you'd like to test this with 2 initial trial posts!"`;
  }

  return `Here is Tanzib's strategic guidance for "${message}":\n\nFocus on demonstrating immediate value using your 3-year Photoshop and Illustrator expertise. Direct the client to your portfolio (${portfolio}) and offer a risk-free first draft concept. Emphasize speed, clear communication, and high-resolution deliverables.`;
}

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
    enrichedPrompt += `\n\n--- TARGET LEAD CONTEXT ---\nTitle: ${leadContext.title}\nCategory: ${leadContext.category || 'Graphic Design'}\nBudget: ${leadContext.budget || 'Flexible'}\nPain: ${leadContext.pain || 'N/A'}\nProposal: ${leadContext.proposal || 'N/A'}\nLink: ${leadContext.link}\n---------------------------`;
  }

  // 1. Primary: Google Gemini REST
  if (GEMINI_API_KEY) {
    const geminiModels = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash'];
    for (const model of geminiModels) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `${enrichedPrompt}\n\nRecent Chat History:\n${JSON.stringify(conversationHistory.slice(-4))}\n\nUser Question:\n${message}` }]
                }
              ]
            })
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) {
            return res.status(200).json({ reply, engine: `Gemini (${model})` });
          }
        }
      } catch (geminiErr) {
        // Fallback to next model
      }
    }
  }

  // 2. Secondary: Groq LPU REST
  if (GROQ_API_KEY) {
    const groqModels = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
    for (const model of groqModels) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${GROQ_API_KEY}`
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: enrichedPrompt },
              ...conversationHistory.slice(-4).map((m: any) => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content
              })),
              { role: 'user', content: message }
            ],
            temperature: 0.3
          })
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          const reply = groqData.choices?.[0]?.message?.content;
          if (reply) {
            return res.status(200).json({ reply, engine: `Groq (${model})` });
          }
        }
      } catch (groqErr) {
        // Fallback to next model
      }
    }
  }

  // 3. Fallback: Smart Business Logic Engine
  const fallbackReply = generateSmartFallback(message, leadContext);
  return res.status(200).json({
    reply: fallbackReply,
    engine: 'Co-Pilot Tactical Rules Engine (Add GEMINI_API_KEY or GROQ_API_KEY to Vercel for live LLM)'
  });
}
