export type FileType = 'image/png' | 'image/gif' | 'image/jpeg';
export type Model = 'gemini-pro' | 'gemini-pro-vision' | 'embedding-001' | (string & {});
export type Role = 'user' | 'model';
export type Format = 'json' | 'markdown';
export type FilePart = { inline_data: { mime_type: FileType; data: string } };
export type TextPart = { text: string };
export type Part = TextPart | FilePart;
export type Message = { parts: Part[]; role: Role };
export type Command = 'countTokens' | 'embedContent' | 'generateContent' | 'streamGenerateContent';
export type SafetyRating = { category: string; probability: string };
export type PromptFeedback = { blockReason?: string; safetyRatings: SafetyRating[] };
export type Candidate = {
  content: { parts: TextPart[]; role: Role };
  finishReason: string;
  index: number;
  safetyRatings: SafetyRating[];
};
