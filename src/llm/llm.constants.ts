export const LLM_GATEWAY = Symbol('LLM_GATEWAY');

export const LLM_PROVIDER_ANTHROPIC = 'anthropic';
export const LLM_PROVIDER_FAKE = 'fake';

export type LlmProvider =
  | typeof LLM_PROVIDER_ANTHROPIC
  | typeof LLM_PROVIDER_FAKE;
