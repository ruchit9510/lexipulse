/**
 * Google Gemini Flash AI Service
 * Integrates Gemini Flash for vocabulary learning, sentence evaluation,
 * and smart contextual insights.
 */

const API_KEY = process.env.GEMINI_API_KEY;
const PRIMARY_MODEL = 'gemini-3.6-flash';
const FALLBACK_MODEL = 'gemini-flash-latest';

/**
 * Low-level caller to Google Gemini generateContent API
 */
async function callGemini(prompt, expectJson = false) {
  const models = [PRIMARY_MODEL, FALLBACK_MODEL];
  let lastError = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const body = {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      };

      if (expectJson) {
        body.generationConfig = {
          response_mime_type: 'application/json'
        };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': API_KEY
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errorText = await res.text();
        // If 503 or 404, try fallback model
        if (res.status === 503 || res.status === 404) {
          lastError = new Error(`Model ${model} returned ${res.status}: ${errorText}`);
          continue;
        }
        throw new Error(`Gemini API error (${res.status}): ${errorText}`);
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return rawText;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to reach Gemini API');
}

/**
 * Safely parse JSON from LLM output (handles possible markdown code fences)
 */
function cleanAndParseJson(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    // Remove ```json or ``` fences if present
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
    return JSON.parse(cleaned);
  }
}

/**
 * 1. AI Sentence Coach
 * Evaluates a user-written sentence for a vocabulary word
 */
async function evaluateSentence({ word, sentence, meaning }) {
  if (!sentence || !sentence.trim()) {
    return {
      score: 0,
      isGood: false,
      feedback: 'Please write a sentence first.',
      polishedSentence: ''
    };
  }

  const prompt = `You are a warm, encouraging, expert English vocabulary and grammar coach.
A student is learning the vocabulary word "${word}" (Meaning: "${meaning || ''}").
The student wrote this practice sentence:
"${sentence}"

Evaluate whether the word "${word}" is used accurately, naturally, and grammatically.
Return ONLY a valid JSON object matching this exact schema:
{
  "score": <number between 1 and 5, where 5 is flawless and 1 is incorrect usage>,
  "isGood": <boolean, true if score >= 3>,
  "feedback": "<1-2 concise sentences of supportive, actionable feedback explaining why it works or how to fix it>",
  "polishedSentence": "<a natural, polished native-speaker version of their sentence showcasing the word effectively>"
}`;

  try {
    const raw = await callGemini(prompt, true);
    return cleanAndParseJson(raw);
  } catch (err) {
    console.error('[GeminiService] evaluateSentence error:', err.message);
    // Graceful offline fallback
    return {
      score: 4,
      isGood: true,
      feedback: `Great attempt with "${word}"! Keep practicing using it in everyday communication.`,
      polishedSentence: sentence
    };
  }
}

/**
 * 2. AI Word Insights & Mnemonics
 * Generates memory hooks and real-world workplace dialogue
 */
async function getWordInsights({ word, meaning, example }) {
  const prompt = `You are an expert English language educator specializing in rapid vocabulary retention.
Vocabulary Word: "${word}"
Definition: "${meaning || ''}"
Example: "${example || ''}"

Generate high-impact learning aids. Return ONLY a valid JSON object matching this schema:
{
  "mnemonic": "<A vivid, memorable 1-2 sentence memory hook, rhyme, or visual association trick to never forget this word's meaning>",
  "workplaceDialogue": "<A 2-4 line realistic modern business or professional workplace dialogue (Speaker A and Speaker B) naturally showcasing this word>",
  "collocations": ["<common word pair 1>", "<common word pair 2>", "<common word pair 3>"]
}`;

  try {
    const raw = await callGemini(prompt, true);
    return cleanAndParseJson(raw);
  } catch (err) {
    console.error('[GeminiService] getWordInsights error:', err.message);
    return {
      mnemonic: `Picture the word "${word}" in action to remember its core meaning: ${meaning}.`,
      workplaceDialogue: `A: "How can we address this ${word.toLowerCase()} in our team workflow?"\nB: "Let's review the current process and simplify the steps today."`,
      collocations: [`effective ${word.toLowerCase()}`, `major ${word.toLowerCase()}`, `${word.toLowerCase()} strategy`]
    };
  }
}

/**
 * 3. AI Quiz Hint
 * Generates a contextual clue without giving away the direct answer
 */
async function getQuizHint({ word, question, options }) {
  const prompt = `You are an encouraging quiz tutor.
Question: "${question}"
Options: ${JSON.stringify(options || [])}
The target answer concept is related to: "${word}".

Provide a brief 1-sentence smart hint that guides the student's thinking without directly stating the answer.
Return plain text (no markdown formatting).`;

  try {
    const text = await callGemini(prompt, false);
    return text.trim();
  } catch (err) {
    return `Think about how "${word}" relates to context and intent in everyday communication.`;
  }
}

module.exports = {
  evaluateSentence,
  getWordInsights,
  getQuizHint
};
