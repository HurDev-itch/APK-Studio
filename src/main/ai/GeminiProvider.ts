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

    async chatStream(messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<AIResponse> {
        if (!this.apiKey) {
            throw new Error("Gemini API Key is not configured.");
        }

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

        if (systemPrompt && geminiContents.length > 0) {
            geminiContents[0].parts[0].text = `[System Instruction: ${systemPrompt}]\n\n${geminiContents[0].parts[0].text}`;
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:streamGenerateContent?key=${this.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: geminiContents })
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Gemini API error (${response.status}): ${errBody}`);
        }

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let fullContent = "";

        // The streaming API returns JSON array chunks like: [ { ... }, { ... } ]
        // We will just do a simple string parsing for demonstration or use a proper SSE if it was SSE.
        // Actually Gemini REST returns an array of chunks, but it's JSON. 
        // We can just extract "text": "..." using regex or naive parsing for now to support streaming.
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunkStr = decoder.decode(value, { stream: true });
                // Hacky but works for Gemini's weird JSON stream format
                const matches = chunkStr.match(/"text"\s*:\s*"([^"]+)"/g);
                if (matches) {
                    for (const match of matches) {
                        try {
                            const textPart = JSON.parse(`{${match}}`).text;
                            fullContent += textPart;
                            onChunk(textPart);
                        } catch(e) {}
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        return {
            content: fullContent,
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
