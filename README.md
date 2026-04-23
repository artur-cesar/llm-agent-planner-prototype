# LLM Agent Planner Prototype

Study repository for building and iterating on LLM-based systems, including agents, planners, and tool calling.

## Setup

Required runtime:

- Node.js `22.22.2`
- npm `10.9.7`

```bash
nvm use
npm install
cp .env.example .env
npm run start:dev
```

## LLM Provider

The default local provider is fake:

```env
LLM_PROVIDER=fake
```

To run against Anthropic locally, set:

```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

Then start the app and call `/ask`:

```bash
npm run start:dev
curl -X POST http://localhost:3000/ask \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Explain agents in one sentence."}'
```
