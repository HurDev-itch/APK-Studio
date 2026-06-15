import { commandBus } from '../core/commandBus';
import type { IAIProvider, ChatMessage } from './types';
import { OllamaProvider } from './OllamaProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { GeminiProvider } from './GeminiProvider';
import { chatHistory } from './AIChatHistory';
import type { AIContext } from './AIContextManager';
import { aiContextManager } from './AIContextManager';
import { eventBus } from '../core/eventBus';

class AIManager {
    private activeProvider: IAIProvider | null = null;
    private providers: Record<string, IAIProvider> = {};

    constructor() {
        // Initialize providers with dummy or env config
        // In a real app, these keys would be read from settings/Preferences
        this.providers['ollama'] = new OllamaProvider();
        this.providers['openai'] = new OpenAIProvider(process.env.OPENAI_API_KEY || '');
        this.providers['gemini'] = new GeminiProvider(process.env.GEMINI_API_KEY || '');
        
        // Default to Ollama if no keys, or just ollama as it's local
        this.activeProvider = this.providers['ollama'];
    }

    setProvider(providerId: string, apiKey?: string) {
        if (!this.providers[providerId]) {
            throw new Error(`Provider ${providerId} not found`);
        }
        
        // Update API key if provided
        if (apiKey) {
            if (providerId === 'openai') {
                this.providers['openai'] = new OpenAIProvider(apiKey);
            } else if (providerId === 'gemini') {
                this.providers['gemini'] = new GeminiProvider(apiKey);
            }
        }
        
        this.activeProvider = this.providers[providerId];
    }

    getProvider(): IAIProvider {
        if (!this.activeProvider) throw new Error("No active AI provider");
        return this.activeProvider;
    }

    registerIPC() {
        commandBus.register('ai.initWorkspace', async (workspaceRoot: string) => {
            chatHistory.initialize(workspaceRoot);
            return true;
        });

        commandBus.register('ai.chat', async (args: { messages: ChatMessage[], context?: AIContext, streamId?: string }) => {
            const provider = this.getProvider();
            const messages = [...args.messages];
            
            if (args.context) {
                const contextPrompt = aiContextManager.buildContextPrompt(args.context);
                const lastUserMsgIndex = messages.findLastIndex(m => m.role === 'user');
                if (lastUserMsgIndex !== -1) {
                    messages[lastUserMsgIndex].content = `${contextPrompt}\n\nUser Query: ${messages[lastUserMsgIndex].content}`;
                }
            }

            const lastOriginalMsg = args.messages[args.messages.length - 1];
            if (lastOriginalMsg && lastOriginalMsg.role === 'user') {
                chatHistory.addMessage('user', lastOriginalMsg.content);
            }

            if (args.streamId && provider.chatStream) {
                const response = await provider.chatStream(messages, (chunk) => {
                    eventBus.publish({ type: `AI_STREAM_${args.streamId}`, payload: chunk });
                });
                chatHistory.addMessage('assistant', response.content, provider.id);
                return response;
            } else {
                const response = await provider.chat(messages);
                chatHistory.addMessage('assistant', response.content, provider.id);
                return response;
            }
        });

        commandBus.register('ai.explainCode', async (code: string) => {
            const provider = this.getProvider();
            return await provider.explainCode(code);
        });

        commandBus.register('ai.analyzeManifest', async (xml: string) => {
            const provider = this.getProvider();
            return await provider.analyzeManifest(xml);
        });

        commandBus.register('ai.getHistory', async () => {
            return chatHistory.getHistory();
        });
    }
}

export const aiManager = new AIManager();
