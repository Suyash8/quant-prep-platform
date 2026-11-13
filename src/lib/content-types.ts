/** Content-only contracts, safe for client and server imports. */
export type Block =
  | { type: 'p'; md: string }
  | { type: 'h2' | 'h3'; text: string }
  | { type: 'math'; tex: string; caption?: string }
  | { type: 'code'; lang: string; code: string; caption?: string; snippet?: boolean; file?: string; requires?: string[] }
  | { type: 'callout'; variant: string; title: string; md: string }
  | { type: 'list'; ordered?: boolean; items: string[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'steps'; title?: string; items: string[] }
  | { type: 'interactive'; component: string; params: Record<string, unknown>; caption?: string }
  | { type: 'ref'; items: { label: string; url: string }[] };

export type QuizQuestion = {
  id: string; type: 'mcq' | 'ms' | 'numeric' | 'short' | 'code-output';
  prompt: string;
  objective?: number;
  options?: string[];
  answerIndex?: number;
  answerIndices?: number[];
  answer?: number | string;
  tolerance?: number;
  modelAnswer?: string;
  keywords?: string[];
  code?: string;
  language?: string;
  explanation: string;
};

