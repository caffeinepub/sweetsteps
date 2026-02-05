// LEGACY FILE - NO LONGER USED
// AI configuration is now handled by the external proxy API
// No API keys or Groq URLs are needed in the frontend

interface AIConfig {
  url: string;
  apiKey: string | null;
  isConfigured: boolean;
}

export function getAIConfig(): AIConfig {
  console.warn('getAIConfig is deprecated. Use aiProxyClient.ts instead.');
  return {
    url: '',
    apiKey: null,
    isConfigured: false,
  };
}
