import React, { useEffect, useState, useRef } from 'react';
import { Trash2 } from 'lucide-react';

export interface BuildLogMessage {
    timestamp: number;
    level: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
    message: string;
}

export const BuildOutputView: React.FC = () => {
    const [logs, setLogs] = useState<BuildLogMessage[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll when new logs arrive
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView();
        }
    }, [logs]);

    // Listen to IPC events for build output
    useEffect(() => {
        const unsubscribe = window.electronAPI.onEvent((event) => {
            if (event.type === 'BUILD_OUTPUT') {
                const message = event.payload as BuildLogMessage;
                setLogs(prev => [...prev, message]);
            }
        });
        return () => unsubscribe();
    }, []);

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'ERROR': return 'text-[#cd3131]';     // Red
            case 'WARNING': return 'text-[#cca700]';   // Yellow
            case 'SUCCESS': return 'text-[#0dbc79]';   // Green
            case 'INFO': return 'text-[#3794ff]';      // Blue
            default: return 'text-ide-text';
        }
    };

    const formatTime = (ms: number) => {
        const d = new Date(ms);
        return `[${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}]`;
    };

    return (
        <div className="flex flex-col h-full w-full bg-ide-bg font-mono text-[13px]">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 py-1 bg-ide-bg-darker border-b border-ide-border shrink-0">
                <button 
                    className="p-1 hover:bg-ide-hover rounded text-ide-text-muted hover:text-ide-text-bright flex items-center gap-1"
                    onClick={() => setLogs([])}
                    title="Clear Build Output"
                >
                    <Trash2 size={14} />
                    <span className="text-[11px] uppercase tracking-wide">Clear</span>
                </button>
            </div>

            {/* Log Area */}
            <div className="flex-1 overflow-y-auto p-2 text-ide-text whitespace-pre-wrap select-text">
                {logs.length === 0 && (
                    <div className="text-ide-text-muted italic">No build output yet. Run a build to see logs here.</div>
                )}
                {logs.map((log, idx) => (
                    <div key={idx} className="flex gap-3 hover:bg-[#2a2d2e] py-[2px] px-2 rounded">
                        <span className="text-ide-text-muted shrink-0 w-[80px]">{formatTime(log.timestamp)}</span>
                        <span className={`shrink-0 w-[70px] font-bold ${getLevelColor(log.level)}`}>{log.level}</span>
                        <span className="flex-1 break-words">{log.message}</span>
                    </div>
                ))}
                <div ref={logsEndRef} />
            </div>
        </div>
    );
};
