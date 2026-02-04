import { getAIConfig } from '../config/ai';

interface OnboardingPayload {
  goal: string;
  currentStanding: string;
  timeframe: string;
}

interface WeeklyMountain {
  name: string;
  weeklyTarget: string;
  note: string;
}

interface AIResponse {
  bigGoal: string;
  weeklyMountain: WeeklyMountain;
  dailyStep: string;
}

interface GroqChatCompletionRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
}

interface GroqChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function callAIEndpoint(payload: OnboardingPayload): Promise<AIResponse> {
  const config = getAIConfig();

  if (!config.isConfigured) {
    throw new Error('AI is not configured. Please set the VITE_AI_API_KEY environment variable.');
  }

  const systemPrompt = `You are a goal-setting assistant. You must respond ONLY with valid JSON, no other text.

Your response must have exactly these keys:
- bigGoal: string (a clear, inspiring statement of the user's goal)
- weeklyMountain: object with keys: name (string), weeklyTarget (string), note (string)
- dailyStep: string (a single actionable daily step)

CRITICAL: Do NOT include "tasks" in weeklyMountain. Weekly tasks are generated later.
Do NOT include any text outside the JSON object.`;

  const userPrompt = `Goal: ${payload.goal}
Current Standing: ${payload.currentStanding}
Timeframe: ${payload.timeframe}

Generate a personalized goal plan with a big goal statement, one sample weekly mountain (with name, weekly target, and note), and one sample daily step.`;

  const requestBody: GroqChatCompletionRequest = {
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 1000,
    response_format: { type: 'json_object' }
  };

  try {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`AI request failed (${response.status}): ${errorText}`);
    }

    const data: GroqChatCompletionResponse = await response.json();

    if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
      throw new Error('Invalid response structure from AI service');
    }

    const contentString = data.choices[0].message.content;
    let parsedContent: any;

    try {
      parsedContent = JSON.parse(contentString);
    } catch (parseError) {
      throw new Error('AI returned invalid JSON. Please try again.');
    }

    // Validate response structure
    if (!parsedContent.bigGoal || typeof parsedContent.bigGoal !== 'string') {
      throw new Error('AI response missing or invalid "bigGoal" field');
    }

    if (!parsedContent.weeklyMountain || typeof parsedContent.weeklyMountain !== 'object') {
      throw new Error('AI response missing or invalid "weeklyMountain" field');
    }

    if (!parsedContent.weeklyMountain.name || typeof parsedContent.weeklyMountain.name !== 'string') {
      throw new Error('AI response missing or invalid "weeklyMountain.name" field');
    }

    if (!parsedContent.weeklyMountain.weeklyTarget || typeof parsedContent.weeklyMountain.weeklyTarget !== 'string') {
      throw new Error('AI response missing or invalid "weeklyMountain.weeklyTarget" field');
    }

    if (!parsedContent.weeklyMountain.note || typeof parsedContent.weeklyMountain.note !== 'string') {
      throw new Error('AI response missing or invalid "weeklyMountain.note" field');
    }

    if (!parsedContent.dailyStep || typeof parsedContent.dailyStep !== 'string') {
      throw new Error('AI response missing or invalid "dailyStep" field');
    }

    return parsedContent as AIResponse;
  } catch (error: any) {
    if (error.message.includes('fetch') || error.name === 'TypeError') {
      throw new Error('Network error: Unable to reach AI service. Please check your connection.');
    }
    
    throw error;
  }
}
