const Anthropic = require('@anthropic-ai/sdk');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, tier } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Extract base64 data from data URL
    const base64Data = image.replace(/^data:image\/(png|jpg|jpeg|gif|webp);base64,/, '');
    const mediaType = image.match(/^data:(image\/[a-zA-Z]+);base64,/)?.[1] || 'image/jpeg';

    const isPro = tier === 'pro';

    const freePrompt = `You are an expert technical analyst. Analyze this stock/crypto/forex chart image and identify the primary chart pattern visible.

Respond in this exact JSON format:
{
  "pattern": "Pattern Name",
  "direction": "Bullish/Bearish/Neutral",
  "confidence": "High/Medium/Low",
  "summary": "One sentence description of what you see"
}

Only return the JSON, nothing else.`;

    const proPrompt = `You are an expert technical analyst with 20+ years of experience. Analyze this stock/crypto/forex chart image in detail.

Respond in this exact JSON format:
{
  "pattern": "Pattern Name",
  "direction": "Bullish/Bearish/Neutral", 
  "confidence": "High/Medium/Low",
  "summary": "2-3 sentence description of the pattern",
  "probability": "XX% historical success rate based on this pattern",
  "entry": "Suggested entry level or zone based on the pattern",
  "exit": "Suggested exit/target level based on pattern projection",
  "stopLoss": "Suggested stop loss level",
  "timeframe": "Estimated timeframe for pattern to play out",
  "keyLevels": "Key support and resistance levels visible",
  "volume": "What volume is telling us about this pattern",
  "risk": "Key risks that could invalidate this pattern"
}

Only return the JSON, nothing else.`;

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: isPro ? proPrompt : freePrompt,
            },
          ],
        },
      ],
    });

    const responseText = message.content[0].text;
    const analysis = JSON.parse(responseText);

    return res.status(200).json({ 
      success: true, 
      analysis,
      tier: isPro ? 'pro' : 'free'
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ 
      error: 'Analysis failed', 
      details: error.message 
    });
  }
}