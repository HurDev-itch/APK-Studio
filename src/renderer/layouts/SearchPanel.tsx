import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';

interface SearchMatch {
    file: string;
    line: number;
    text: string;
}

export const SearchPanel: React.FC = () => {
    const { workspaceRoot, openTab } = useWorkspaceStore();
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState<{ [file: string]: SearchMatch[] }>({});
    const [expandedFiles, setExpandedFiles] = useState<{ [file: string]: boolean }>({});

    const handleSearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && query.trim() && workspaceRoot) {
            setIsSearching(true);
            try {
                // Assuming we add a `fs.search` IPC handler in workspaceManager
                const res = await window.electronAPI.executeCommand('workspace.search', {
                    workspaceRoot,
                    query: query.trim()
                });
                
                if (res.success) {
                    // res.data is expected to be an array of { file, line, text }
                    const grouped: { [file: string]: SearchMatch[] } = {};
                    const expanded: { [file: string]: boolean } = {};
                    
                    for (const match of res.data) {
                        if (!grouped[match.file]) {
                            grouped[match.file] = [];
                            expanded[match.file] = true;
                        }
                        grouped[match.file].push(match);
                    }
                    setResults(grouped);
                    setExpandedFiles(expanded);
                }
            } catch (err) {
                console.error(err);
            }
            setIsSearching(false);
        }
    };

    const toggleExpand = (file: string) => {
        setExpandedFiles(prev => ({ ...prev, [file]: !prev[file] }));
    };

    const handleResultClick = async (file: string, _line: number) => {
        if (!workspaceRoot) return;
        try {
            const absolutePath = `${workspaceRoot}/${file}`;
            const res = await window.electronAPI.executeCommand('fs.readFile', absolutePath);
            if (res.success) {
                // Split file path to get name
                const parts = file.split(/[\\/]/);
                const name = parts[parts.length - 1];
                openTab(absolutePath, name, res.data);
                // In a full implementation, we would scroll to the specific line
                // EditorArea could listen to a "scroll to line" event or take line as prop
            }
        } catch (err) {
            console.error(err);
        }
    };

    const resultFiles = Object.keys(results);

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="p-4 flex flex-col gap-4 border-b border-ide-border shrink-0">
                <div className="text-[11px] uppercase font-semibold text-ide-text-muted tracking-wider">Search</div>
                <div className="flex items-center gap-2 bg-ide-bg border border-ide-border rounded px-2 py-1 focus-within:border-ide-accent">
                    {isSearching ? <Loader2 size={14} className="text-ide-text-muted animate-spin" /> : <Search size={14} className="text-ide-text-muted" />}
                    <input 
                        type="text" 
                        placeholder="Search workspace..." 
                        className="bg-transparent text-ide-text-bright text-sm outline-none w-full placeholder:text-ide-text-muted/50"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleSearch}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {resultFiles.length === 0 && query && !isSearching && (
                    <div className="p-4 text-xs text-ide-text-muted">No results found.</div>
                )}
                
                {resultFiles.map(file => (
                    <div key={file} className="text-[13px] font-mono">
                        <div 
                            className="flex items-center gap-1 cursor-pointer hover:bg-ide-hover px-2 py-1 text-ide-text-bright"
                            onClick={() => toggleExpand(file)}
                        >
                            {expandedFiles[file] ? <ChevronDown size={14} className="text-ide-text-muted shrink-0" /> : <ChevronRight size={14} className="text-ide-text-muted shrink-0" />}
                            <span className="truncate" title={file}>{file}</span>
                            <span className="ml-auto text-[10px] text-ide-text-muted bg-ide-bg px-1.5 rounded-full">{results[file].length}</span>
                        </div>
                        
                        {expandedFiles[file] && results[file].map((match, i) => (
                            <div 
                                key={i}
                                className="flex cursor-pointer hover:bg-ide-hover px-2 py-1 pl-6 text-ide-text-muted hover:text-ide-text-bright"
                                onClick={() => handleResultClick(file, match.line)}
                            >
                                <span className="w-8 shrink-0 text-right mr-2 opacity-50 select-none">{match.line}</span>
                                <span className="truncate">{match.text.trim()}</span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};
