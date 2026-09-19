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
You are the 24/7 Strategic Graphic Design Partner for Tanzib Ul Alam.
Tanzib is an expert Graphic Designer based in Rajshahi, Bangladesh with 3+ years of experience.
Specialties: Photoshop, Illustrator, Social Media Design, Flyers, Posters, Book Covers, Vector Tracing.
Portfolio: https://drive.google.com/drive/folders/1UDsUcIsEEhv1isTU_DuQlGQEdMmQ7e3H
Contact: WhatsApp +880 1992796109 | tanzibulalam5@gmail.com

CRITICAL FORMATTING RULES (STRICT COMPLIANCE):
1. NEVER use markdown symbols such as asterisks (** or *), hashtags (###), underscores (_), backticks, or code blocks.
2. NEVER wrap proposals in quotation marks ("...").
3. Write clean, natural plain text with regular paragraphs and line breaks.
4. Tanzib copies your text directly into client DMs (WhatsApp, Reddit, Upwork, Email), so all output must look 100% human-typed and ready to send.
`;

function sanitizePlainText(text: string): string {
  if (!text) return '';
  return text
    .replace(/#{1,6}\s?/g, '')          // Strip markdown headers
    .replace(/\*\*(.*?)\*\*/g, '$1')    // Strip bold **
    .replace(/\*(.*?)\*/g, '$1')        // Strip italics *
    .replace(/__(.*?)__/g, '$1')        // Strip __
    .replace(/_(.*?)_/g, '$1')          // Strip _
    .replace(/`{1,3}(.*?)`{1,3}/gs, '$1') // Strip code ticks
    .replace(/^\s*[\*\-]\s+/gm, '• ')   // Clean bullet points
    .replace(/^["']|["']$/g, '')        // Strip outer quotes
    .trim();
}

function generateSmartFallback(message: string, leadContext: any): string {
  const lower = message.toLowerCase();
  const title = leadContext?.title || 'your design project';
  const category = leadContext?.category || 'Graphic Design';
  const portfolio = 'https://drive.google.com/drive/folders/1UDsUcIsEEhv1isTU_DuQlGQEdMmQ7e3H';

  if (lower.includes('pitch') || lower.includes('proposal') || lower.includes('fast pitch')) {
    return `Hi there! I saw your requirement for ${category} and would love to help bring your vision to life. With 3+ years of experience in Photoshop and Illustrator, I deliver clean, production-ready designs with fast turnaround and dedicated revisions.\n\nYou can review my recent client projects here: ${portfolio}\n\nLet me know your preferred timeline and we can get started right away!`;
  }

  if (lower.includes('budget') || lower.includes('counter') || lower.includes('discount')) {
    return `I completely respect your budget! To deliver the premium visual quality your project deserves, my standard rate for ${category} is typically higher. However, to work within your current budget, I can deliver a streamlined package with 2 revision rounds. Alternatively, if you anticipate ongoing work, we can bundle multiple designs into a monthly retainer for maximum savings. Would that work for you?`;
  }

  if (lower.includes('retainer') || lower.includes('bundle') || lower.includes('monthly')) {
    return `Instead of paying per individual graphic, I offer an ongoing Monthly Growth Retainer:\n\n• 10 High-converting posts or ads (Photoshop & Illustrator)\n• Formatted for Instagram, Facebook, and LinkedIn\n• Editable source files + 48h turnaround per asset\n• Priority revisions\n\nYou can view my portfolio here: ${portfolio}\n\nLet me know if you would like to test this with 2 initial trial posts!`;
  }

  return `Here is Tanzib's strategic advice for ${message}:\n\nFocus on demonstrating immediate value with your 3-year Photoshop and Illustrator expertise. Share your portfolio link (${portfolio}) and offer a clear turnaround time. Keep communication direct, friendly, and client-focused.`;
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
    enrichedPrompt += `\n\nTARGET LEAD IN FOCUS:\nTitle: ${leadContext.title}\nCategory: ${leadContext.category || 'Graphic Design'}\nBudget: ${leadContext.budget || 'Flexible'}\nPain: ${leadContext.pain || 'N/A'}\nLink: ${leadContext.link}\n`;
  }

  // 1. Primary: Gemini REST
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
                  parts: [{ text: `${enrichedPrompt}\n\nConversation History:\n${JSON.stringify(conversationHistory.slice(-4))}\n\nUser Question:\n${message}\n\nRemember: ZERO markdown asterisks or symbols. Pure clean human text only.` }]
                }
              ]
            })
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawReply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawReply) {
            return res.status(200).json({ reply: sanitizePlainText(rawReply), engine: `Gemini (${model})` });
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
              { role: 'user', content: `${message} (Reminder: Write in clean natural text without any asterisks or formatting symbols)` }
            ],
            temperature: 0.3
          })
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          const rawReply = groqData.choices?.[0]?.message?.content;
          if (rawReply) {
            return res.status(200).json({ reply: sanitizePlainText(rawReply), engine: `Groq (${model})` });
          }
        }
      } catch (groqErr) {
        // Fallback to next model
      }
    }
  }

  // 3. Fallback
  const fallbackReply = generateSmartFallback(message, leadContext);
  return res.status(200).json({
    reply: sanitizePlainText(fallbackReply),
    engine: 'Co-Pilot Tactical Rules Engine'
  });
}
