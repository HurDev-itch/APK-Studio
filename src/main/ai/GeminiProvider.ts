import type { IAIProvider, ChatMessage, AIResponse } from './types';

export class GeminiProvider implements IAIProvider {
    id = 'gemini';
    name = 'Google Gemini';
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = 'gemini-1.5-pro') {
        this.apiKey = apiKey;
        this.model = model;
    }

    async chat(messages: ChatMessage[]): Promise<AIResponse> {
        if (!this.apiKey) {
            throw new Error("Gemini API Key is not configured.");
        }

        // Gemini REST API format conversion
        // Note: system instructions are handled differently in Gemini API, 
        // here we simply prepend system messages to the user prompt for standard REST compatibility without SDK.
        let systemPrompt = "";
        const geminiContents = messages.map(msg => {
            if (msg.role === 'system') {
                systemPrompt += msg.content + "\n";
                return null;
            }
            return {
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            };
        }).filter(Boolean) as any[];

        // If system prompt exists, prepend it to the first user message
        if (systemPrompt && geminiContents.length > 0) {
            geminiContents[0].parts[0].text = `[System Instruction: ${systemPrompt}]\n\n${geminiContents[0].parts[0].text}`;
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: geminiContents })
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Gemini API error (${response.status}): ${errBody}`);
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        return {
            content,
            modelUsed: this.model
        };
    }

    async explainCode(code: string): Promise<string> {
        const res = await this.chat([
            { role: 'system', content: 'You are an expert Android developer. Explain the following code concisely.' },
            { role: 'user', content: code }
        ]);
        return res.content;
    }

    async analyzeManifest(xml: string): Promise<string> {
        const res = await this.chat([
            { role: 'system', content: 'You are an Android security expert. Analyze this AndroidManifest.xml for potential security vulnerabilities, misconfigurations, or unnecessary permissions.' },
            { role: 'user', content: xml }
        ]);
        return res.content;
    }

    async summarize(text: string): Promise<string> {
        const res = await this.chat([
            { role: 'system', content: 'Provide a brief summary of the following text.' },
            { role: 'user', content: text }
        ]);
        return res.content;
    }
}
