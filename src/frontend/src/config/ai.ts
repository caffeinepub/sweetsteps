interface AIConfig {
  url: string;
  apiKey: string | null;
  isConfigured: boolean;
}

export function getAIConfig(): AIConfig {
  const url = import.meta.env.VITE_AI_ENDPOINT_URL || 'https://api.groq.com/openai/v1/chat/completions';
  const apiKey = import.meta.env.VITE_AI_API_KEY || null;

  return {
    url,
    apiKey,
    isConfigured: !!apiKey
  };
}
