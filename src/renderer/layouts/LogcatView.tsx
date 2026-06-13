import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause, Trash2, Search, Filter } from 'lucide-react';

interface LogEntry {
    id: number;
    timestamp: string;
    level: string;
    tag: string;
    pid: string;
    message: string;
    raw: string;
}

export const LogcatView: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isPaused, setIsPaused] = useState(false);
    const [filterLevel, setFilterLevel] = useState('Verbose');
    const [searchText, setSearchText] = useState('');
    const logsEndRef = useRef<HTMLDivElement>(null);
    const logIdCounter = useRef(0);

    // Auto-scroll when new logs arrive if not paused
    useEffect(() => {
        if (!isPaused && logsEndRef.current) {
            logsEndRef.current.scrollIntoView();
        }
    }, [logs, isPaused]);

    // Listen to IPC events for logcat output
    useEffect(() => {
        const unsubscribe = window.electronAPI.onEvent((event) => {
            if (event.type === 'LOGCAT_OUTPUT') {
                if (!isPaused) {
                    const parsed = parseLogcatLine(event.payload);
                    if (parsed) {
                        setLogs(prev => [...prev, parsed].slice(-5000)); // Keep last 5000 lines
                    }
                }
            }
        });
        return () => unsubscribe();
    }, [isPaused]);

    const parseLogcatLine = (line: string): LogEntry | null => {
        // Very basic parsing for standard brief/threadtime format
        // Example: 06-12 12:34:56.789 1234 5678 D Tag: Message
        const regex = /^(\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\.\d{3})\s+(\d+)\s+(\d+)\s+([VDIWEF])\s+(.*?):\s+(.*)$/;
        const match = line.match(regex);
        if (match) {
            let levelStr = 'Verbose';
            switch(match[4]) {
                case 'D': levelStr = 'Debug'; break;
                case 'I': levelStr = 'Info'; break;
                case 'W': levelStr = 'Warning'; break;
                case 'E': levelStr = 'Error'; break;
                case 'F': levelStr = 'Fatal'; break;
            }
            return {
                id: logIdCounter.current++,
                timestamp: match[1],
                pid: match[2],
                level: levelStr,
                tag: match[5].trim(),
                message: match[6],
                raw: line
            };
        }
        return {
            id: logIdCounter.current++,
            timestamp: '',
            pid: '',
            level: 'Verbose',
            tag: '',
            message: line,
            raw: line
        };
    };

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'Error': case 'Fatal': return 'text-[#cd3131]';
            case 'Warning': return 'text-[#cca700]';
            case 'Info': return 'text-[#3794ff]';
            case 'Debug': return 'text-ide-text-muted';
            default: return 'text-ide-text';
        }
    };

    const handleClear = () => setLogs([]);

    const filteredLogs = logs.filter(log => {
        if (filterLevel !== 'Verbose') {
            const levels = ['Verbose', 'Debug', 'Info', 'Warning', 'Error', 'Fatal'];
            if (levels.indexOf(log.level) < levels.indexOf(filterLevel)) return false;
        }
        if (searchText) {
            try {
                const regex = new RegExp(searchText, 'i');
                if (!regex.test(log.raw)) return false;
            } catch {
                if (!log.raw.toLowerCase().includes(searchText.toLowerCase())) return false;
            }
        }
        return true;
    });

    return (
        <div className="flex-1 w-full h-full bg-ide-bg flex flex-col font-sans">
            {/* Logcat Toolbar */}
            <div className="h-8 border-b border-ide-border flex items-center px-2 gap-2 shrink-0 bg-ide-panel">
                <button onClick={() => setIsPaused(!isPaused)} className={`p-1 rounded hover:bg-ide-hover ${isPaused ? 'text-ide-accent' : 'text-ide-text-muted'}`} title={isPaused ? "Resume" : "Pause"}>
                    {isPaused ? <Play size={14} /> : <Pause size={14} />}
                </button>
                <button onClick={handleClear} className="p-1 rounded hover:bg-ide-hover text-ide-text-muted" title="Clear Logcat">
                    <Trash2 size={14} />
                </button>
                <div className="w-[1px] h-4 bg-ide-border mx-1"></div>
                
                <div className="flex items-center gap-1 bg-ide-bg border border-ide-border rounded px-2 h-6">
                    <Filter size={12} className="text-ide-text-muted" />
                    <select 
                        value={filterLevel} 
                        onChange={(e) => setFilterLevel(e.target.value)}
                        className="bg-transparent text-xs text-ide-text outline-none"
                    >
                        <option>Verbose</option>
                        <option>Debug</option>
                        <option>Info</option>
                        <option>Warning</option>
                        <option>Error</option>
                    </select>
                </div>
                
                <div className="flex items-center gap-1 bg-ide-bg border border-ide-border rounded px-2 h-6 flex-1 max-w-[300px]">
                    <Search size={12} className="text-ide-text-muted" />
                    <input 
                        type="text" 
                        value={searchText} 
                        onChange={(e) => setSearchText(e.target.value)} 
                        placeholder="Search (regex supported)" 
                        className="bg-transparent text-xs text-ide-text outline-none w-full"
                    />
                </div>
            </div>

            {/* Logcat Output */}
            <div className="flex-1 overflow-y-auto p-2 font-mono text-[13px] leading-relaxed select-text">
                {filteredLogs.map(log => (
                    <div key={log.id} className="flex gap-4 hover:bg-ide-hover/50 px-1">
                        <span className="text-ide-text-muted shrink-0 w-36">{log.timestamp}</span>
                        <span className={`shrink-0 w-16 font-semibold ${getLevelColor(log.level)}`}>{log.level.charAt(0)}</span>
                        <span className="text-[#4EC9B0] shrink-0 w-48 truncate" title={log.tag}>{log.tag}</span>
                        <span className={`${getLevelColor(log.level)} break-all`}>{log.message}</span>
                    </div>
                ))}
                <div ref={logsEndRef} />
            </div>
        </div>
    );
};
