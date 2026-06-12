import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Trash2, X, FileText, Settings } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface AIPanelProps {
    onClose: () => void;
}

export const AIPanel: React.FC<AIPanelProps> = ({ onClose }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { activeTab, workspaceRoot } = useWorkspaceStore();

    useEffect(() => {
        // Load history on mount
        const loadHistory = async () => {
            try {
                const res = await window.electronAPI.executeCommand('ai.getHistory');
                if (res.success && res.data) {
                    setMessages(res.data.map((row: any) => ({
                        role: row.role,
                        content: row.content
                    })));
                }
            } catch (e) {
                console.error("Failed to load AI history", e);
            }
        };
        loadHistory();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const newMessages: Message[] = [...messages, { role: 'user', content: input }];
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        try {
            // Build Context
            const context = {
                activeFilePath: activeTab || undefined,
                workspaceRoot: workspaceRoot || undefined
            };

            const res = await window.electronAPI.executeCommand('ai.chat', {
                messages: newMessages,
                context
            });

            if (res.success) {
                setMessages(prev => [...prev, { role: 'assistant', content: res.data.content }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: `**Error:** ${res.error}` }]);
            }
        } catch (e: any) {
            setMessages(prev => [...prev, { role: 'assistant', content: `**Error:** ${e.message}` }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-80 h-full shrink-0 bg-ide-surface border-l border-ide-border flex flex-col z-20">
            {/* Header */}
            <div className="h-10 px-3 flex items-center justify-between border-b border-ide-border">
                <div className="flex items-center gap-2 text-ide-text-bright font-medium text-[13px]">
                    <Bot size={16} className="text-ide-accent" />
                    AI Assistant
                </div>
                <div className="flex items-center gap-2">
                    <button title="Clear History" onClick={() => setMessages([])}>
                        <Trash2 size={14} className="cursor-pointer text-ide-text-muted hover:text-red-400 transition-colors" />
                    </button>
                    <button title="AI Settings">
                        <Settings size={14} className="cursor-pointer text-ide-text-muted hover:text-white transition-colors" />
                    </button>
                    <button title="Close" onClick={onClose}>
                        <X size={16} className="cursor-pointer text-ide-text-muted hover:text-white transition-colors" />
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-[13px]">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-ide-text-muted opacity-60 text-center space-y-4">
                        <Bot size={48} />
                        <p>Ask a question about your code or Android project to get started.</p>
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] rounded-md p-3 whitespace-pre-wrap ${msg.role === 'user' ? 'bg-ide-accent text-white' : 'bg-[#252526] text-ide-text border border-ide-border'}`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-[#252526] text-ide-text-muted rounded-md p-3 border border-ide-border italic flex items-center gap-2">
                            <span className="w-2 h-2 bg-ide-accent rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-ide-accent rounded-full animate-bounce delay-100"></span>
                            <span className="w-2 h-2 bg-ide-accent rounded-full animate-bounce delay-200"></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-[#1e1e1e] border-t border-ide-border">
                {activeTab && (
                    <div className="flex items-center gap-1.5 text-[11px] text-ide-text-muted mb-2 bg-[#252526] px-2 py-1 rounded w-fit border border-ide-border">
                        <FileText size={12} />
                        <span className="truncate max-w-[200px]">{activeTab.split(/[/\\]/).pop()}</span>
                    </div>
                )}
                <div className="relative">
                    <textarea 
                        className="w-full bg-[#252526] border border-ide-border rounded-md pl-3 pr-10 py-2 text-[13px] text-ide-text focus:outline-none focus:border-ide-accent resize-none placeholder:text-ide-text-muted"
                        rows={3}
                        placeholder="Ask the AI Assistant..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                    />
                    <button 
                        className={`absolute right-2 bottom-2 p-1.5 rounded-md transition-colors ${input.trim() ? 'bg-ide-accent text-white hover:bg-opacity-90' : 'text-ide-text-muted cursor-not-allowed'}`}
                        disabled={!input.trim() || loading}
                        onClick={handleSend}
                    >
                        <Send size={14} />
                    </button>
                </div>
            </div>
        </div>
    );
};
