const Anthropic = require('@anthropic-ai/sdk');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { image, tier } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const base64Data = image.replace(/^data:image\/(png|jpg|jpeg|gif|webp);base64,/, '');
    const mediaTypeMatch = image.match(/^data:(image\/[a-zA-Z]+);base64,/);
    const mediaType = mediaTypeMatch ? mediaTypeMatch[1] : 'image/jpeg';

    const isPro = tier === 'pro';

    const freePrompt = `You are an expert technical analyst. Analyze this stock/crypto/forex chart image and identify the primary chart pattern visible.

Respond in this exact JSON format with no extra text:
{
  "pattern": "Pattern Name",
  "direction": "Bullish",
  "confidence": "High",
  "summary": "One to two sentence description of what you see in this chart."
}`;

    const proPrompt = `You are an expert technical analyst with 20+ years of experience. Analyze this stock/crypto/forex chart image in detail.

Respond in this exact JSON format with no extra text:
{
  "pattern": "Pattern Name",
  "direction": "Bullish",
  "confidence": "High",
  "summary": "2-3 sentence description of the pattern and current price action.",
  "probability": "68% historical success rate based on this pattern type",
  "entry": "Suggested entry level or zone based on the pattern",
  "exit": "Suggested exit or target level based on pattern projection",
  "stopLoss": "Suggested stop loss level to invalidate the pattern",
  "timeframe": "Estimated timeframe for pattern to play out",
  "keyLevels": "Key support and resistance levels visible on the chart",
  "volume": "What volume is indicating about the strength of this pattern",
  "risk": "Key risks or conditions that could invalidate this pattern"
}`;

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
    
    // Clean response in case Claude adds extra text
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse AI response');
    }
    
    const analysis = JSON.parse(jsonMatch[0]);

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
};
```

Save that, then push to GitHub:
```
git add .
git commit -m "fix analyze.js handler syntax"
git push origin main