// llm-client.js
const Groq = require("groq-sdk");
const OpenAI = require("openai");
const config = require("../config");

/**
 * Creates an appropriate client based on the provider
 * @param {string} provider - The LLM provider name ('groq' or 'sambanova')
 * @returns {Object} The initialized client
 */
function createLLMClient(provider) {
  switch (provider.toLowerCase()) {
    case "groq":
      return new Groq({ apiKey: process.env.GROQ_API_KEY });
    case "sambanova":
      return new OpenAI({
        apiKey: process.env.SAMBANOVA_API_KEY,
        baseURL: process.env.SAMBANOVA_API_BASE_URL,
      });
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

/**
 * Gets the appropriate model name for a provider
 * @param {string} provider - The LLM provider name
 * @returns {string} The model name
 */
function getModelName(provider) {
  const providerKey = provider.toLowerCase();

  // Check if provider exists in config
  if (config.api && config.api[providerKey] && config.api[providerKey].model) {
    return config.api[providerKey].model;
  }

  // Default models if not in config
  switch (providerKey) {
    case "groq":
      return "llama3-70b-8192";
    case "sambanova":
      return "Meta-Llama-3.3-70B-Instruct";
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

/**
 * Generates a completion using the provided client
 * @param {Object} client - The LLM client
 * @param {string} modelName - The model name
 * @param {string} systemPrompt - The system prompt
 * @param {string} userContent - The user content
 * @param {Object} options - Additional options
 * @returns {Promise<string>} The generated completion
 */
async function generateCompletion(
  client,
  modelName,
  systemPrompt,
  userContent,
  options = {}
) {
  try {
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: options.temperature || 0,
      max_tokens: options.maxTokens || 4000,
    });

    if (response.choices && response.choices[0]) {
      return response.choices[0].message.content;
    } else {
      throw new Error(
        "Unexpected response format: " + JSON.stringify(response)
      );
    }
  } catch (error) {
    throw new Error(`API completion failed: ${error.message}`);
  }
}

module.exports = {
  createLLMClient,
  getModelName,
  generateCompletion,
};
