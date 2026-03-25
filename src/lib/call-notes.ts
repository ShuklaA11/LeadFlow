import { generateLLMResponse } from './llm';
import { StructuredNotes } from '@/types';

interface LeadContext {
  firstName: string;
  lastName: string;
  company: string;
  title?: string | null;
  currentStage: string;
  conversationStage: string;
}

export async function generateStructuredNotes(
  content: string,
  leadContext: LeadContext,
  isManualNotes: boolean = false,
): Promise<StructuredNotes> {
  const contentType = isManualNotes ? 'manual notes from a call' : 'a call transcript';

  const systemPrompt = `You are an expert at analyzing sales and business development calls. Given ${contentType} with a lead, extract structured insights.

You MUST respond with ONLY a valid JSON object matching this exact structure (no markdown, no code blocks, no extra text):
{
  "summary": "2-3 sentence overview of the call",
  "keyPoints": ["point 1", "point 2"],
  "quotes": ["notable quote 1"],
  "objections": ["concern or pushback raised"],
  "validationSignals": ["positive signals indicating interest or fit"],
  "commitments": ["who committed to what, by when"],
  "nextSteps": ["agreed follow-up actions"],
  "sentiment": "one of: very_positive, positive, neutral, negative, very_negative",
  "sentimentScore": 0.5
}

Rules:
- sentimentScore is a float from -1.0 (very negative) to 1.0 (very positive)
- All array fields should have at least one entry, or an empty array if nothing applies
- quotes should be verbatim from the transcript when possible${isManualNotes ? ', or paraphrased from notes' : ''}
- Be specific and actionable in nextSteps and commitments
- Focus on business-relevant insights`;

  const userPrompt = `Lead: ${leadContext.firstName} ${leadContext.lastName}
Company: ${leadContext.company}
${leadContext.title ? `Title: ${leadContext.title}` : ''}
Pipeline Stage: ${leadContext.currentStage}
Conversation Stage: ${leadContext.conversationStage}

${isManualNotes ? 'Manual Notes' : 'Transcript'}:
${content}`;

  const response = await generateLLMResponse([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], 2048);

  return parseStructuredNotes(response);
}

function parseStructuredNotes(raw: string): StructuredNotes {
  // Strip markdown code blocks if present
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }

  const parsed = JSON.parse(cleaned);

  // Validate and provide defaults
  return {
    summary: parsed.summary || '',
    keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
    quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
    objections: Array.isArray(parsed.objections) ? parsed.objections : [],
    validationSignals: Array.isArray(parsed.validationSignals) ? parsed.validationSignals : [],
    commitments: Array.isArray(parsed.commitments) ? parsed.commitments : [],
    nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
    sentiment: parsed.sentiment || 'neutral',
    sentimentScore: typeof parsed.sentimentScore === 'number' ? parsed.sentimentScore : 0,
  };
}
