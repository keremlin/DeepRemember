const express = require('express');
const AuthMiddleware = require('../security/authMiddleware');
const { Groq } = require('../llm/groq');
const { Ollama } = require('../llm/ollama');

const router = express.Router();
const authMiddleware = new AuthMiddleware();

const normalizeBaseUrl = (url) => {
  if (!url) {
    return '';
  }
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

const mapGroqModels = (data) => {
  const models = Array.isArray(data?.data) ? data.data : [];
  return models.map(model => ({
    id: model.id,
    description: model.description || '',
    ownedBy: model.owned_by || '',
    created: model.created || null,
    public: model.public ?? undefined
  }));
};

const mapOllamaModels = (data) => {
  const entries = Array.isArray(data?.models) ? data.models : Array.isArray(data?.tags) ? data.tags : [];
  return entries.map(model => ({
    id: model.model || model.name || '',
    name: model.name || model.model || '',
    size: model.size || model.size_bytes || null,
    modifiedAt: model.modified_at || null,
    details: model.details || {}
  })).filter(model => model.id);
};

router.get('/models', authMiddleware.verifyToken, async (req, res) => {
  const requestedProvider = (req.query.provider || process.env.LLM_PROVIDER || 'ollama').toLowerCase();
  const defaultModel = process.env.LLM_MODEL || '';

  try {
    let models = [];

    switch (requestedProvider) {
      case 'groq': {
        const groqClient = new Groq({
          baseUrl: process.env.LLM_BASE_URL,
          model: defaultModel,
          apiKey: process.env.LLM_API_KEY
        });

        const response = await groqClient.client.models.list();
        models = mapGroqModels(response);
        break;
      }
      case 'ollama': {
        const baseUrl = normalizeBaseUrl(process.env.LLM_BASE_URL || 'http://localhost:11434');
        const response = await fetch(`${baseUrl}/api/tags`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          const message = await response.text().catch(() => 'Unable to fetch models');
          throw new Error(`Ollama returned ${response.status}: ${message}`);
        }

        const data = await response.json();
        models = mapOllamaModels(data);
        break;
      }
      default:
        return res.status(400).json({ error: `Unsupported LLM provider: ${requestedProvider}` });
    }

    res.json({
      success: true,
      provider: requestedProvider,
      models,
      defaultModel: defaultModel || (models[0]?.id ?? '')
    });
  } catch (error) {
    console.error('[LLM] Failed to load models:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load LLM models',
      details: error.message
    });
  }
});

module.exports = router;


