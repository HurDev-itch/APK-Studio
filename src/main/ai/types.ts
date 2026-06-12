export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface AIResponse {
    content: string;
    modelUsed: string;
    tokensUsed?: number;
}

export interface IAIProvider {
    id: string;
    name: string;

    chat(messages: ChatMessage[]): Promise<AIResponse>;
    explainCode(code: string): Promise<string>;
    analyzeManifest(xml: string): Promise<string>;
    summarize(text: string): Promise<string>;
}
