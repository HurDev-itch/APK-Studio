import type { IAIProvider, ChatMessage, AIResponse } from './types';

export class OllamaProvider implements IAIProvider {
    id = 'ollama';
    name = 'Ollama (Local)';
    private baseUrl: string;
    private model: string;

    constructor(baseUrl: string = 'http://localhost:11434', model: string = 'llama3') {
        this.baseUrl = baseUrl;
        this.model = model;
    }

    async chat(messages: ChatMessage[]): Promise<AIResponse> {
        const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.model,
                messages: messages,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
        }

        const data = await response.json();
        return {
            content: data.message.content,
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
