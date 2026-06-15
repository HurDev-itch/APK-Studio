import type { IAIProvider, ChatMessage, AIResponse } from './types';

export class OpenAIProvider implements IAIProvider {
    id = 'openai';
    name = 'OpenAI';
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = 'gpt-4o') {
        this.apiKey = apiKey;
        this.model = model;
    }

    async chat(messages: ChatMessage[]): Promise<AIResponse> {
        if (!this.apiKey) {
            throw new Error("OpenAI API Key is not configured.");
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: messages,
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`OpenAI API error (${response.status}): ${errBody}`);
        }

        const data = await response.json();
        return {
            content: data.choices[0].message.content,
            modelUsed: this.model,
            tokensUsed: data.usage?.total_tokens
        };
    }

    async chatStream(messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<AIResponse> {
        if (!this.apiKey) {
            throw new Error("OpenAI API Key is not configured.");
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: messages,
                stream: true
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`OpenAI API error (${response.status}): ${errBody}`);
        }

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let fullContent = "";

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunkStr = decoder.decode(value, { stream: true });
                const lines = chunkStr.split('\n').filter(line => line.trim() !== '');
                
                for (const line of lines) {
                    if (line.replace(/^data: /, '').trim() === '[DONE]') {
                        break;
                    }
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.replace(/^data: /, ''));
                            if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                                const text = data.choices[0].delta.content;
                                fullContent += text;
                                onChunk(text);
                            }
                        } catch (e) {
                            // ignore parse errors for partial chunks
                        }
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
