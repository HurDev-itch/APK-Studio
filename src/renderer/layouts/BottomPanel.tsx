import { Terminal, PanelBottomClose, X, ChevronUp, Trash2, Search, ArrowDown } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { useWorkspaceStore } from '../store/workspaceStore';
import { LogcatView } from './LogcatView';
import { ProblemsPanel } from './ProblemsPanel';
import { BuildOutputView } from './BuildOutputView';
import 'xterm/css/xterm.css';

const TABS = ['Terminal', 'Build', 'Logcat', 'Problems'];

export const BottomPanel = () => {
    const { bottomPanelOpen, bottomPanelTab, bottomPanelHeight, setBottomPanelState, setBottomPanelHeight } = useWorkspaceStore();
    const terminalRef = useRef<HTMLDivElement>(null);
    const xterm = useRef<XTerm | null>(null);
    const fitAddon = useRef<FitAddon | null>(null);
    const searchAddon = useRef<SearchAddon | null>(null);
    const initialized = useRef(false);
    
    const [searchText, setSearchText] = useState('');
    const isDragging = useRef(false);

    useEffect(() => {
        if (!terminalRef.current || initialized.current) return;
        initialized.current = true;
        
        // Initialize Xterm.js
        xterm.current = new XTerm({
            theme: {
                background: '#1e1e1e',
                foreground: '#cccccc',
                cursor: '#ffffff',
                selectionBackground: '#5da5d533',
                black: '#000000',
                red: '#cd3131',
                green: '#0dbc79',
                yellow: '#e5e510',
                blue: '#2472c8',
                magenta: '#bc3fbc',
                cyan: '#11a8cd',
                white: '#e5e5e5',
            },
            fontFamily: 'Consolas, "Courier New", monospace',
            fontSize: 13,
            lineHeight: 1.2,
            cursorBlink: true,
            // @ts-ignore - wordWrap as requested
            wordWrap: true,
        });

        fitAddon.current = new FitAddon();
        searchAddon.current = new SearchAddon();
        
        xterm.current.loadAddon(fitAddon.current);
        xterm.current.loadAddon(searchAddon.current);

        // Open first, then fit on next frame when DOM has dimensions
        xterm.current.open(terminalRef.current);
        
        requestAnimationFrame(() => {
            try {
                fitAddon.current?.fit();
                xterm.current?.writeln('\x1b[90m APK Studio Terminal\x1b[0m');
                xterm.current?.writeln('\x1b[90m Ready.\x1b[0m');
                xterm.current?.writeln('');
            } catch(e) {
                console.error("Xterm fit error:", e);
            }
        });

        // Handle window resize
        const handleResize = () => {
            try {
                fitAddon.current?.fit();
            } catch(e) {}
        };
        window.addEventListener('resize', handleResize);

        // Listen for IPC events from main process (TERMINAL_OUTPUT)
        const unsubscribe = window.electronAPI.onEvent((event) => {
            if (event.type === 'TERMINAL_OUTPUT') {
                xterm.current?.write(event.payload);
            }
        });

        return () => {
            window.removeEventListener('resize', handleResize);
            unsubscribe();
            xterm.current?.dispose();
            initialized.current = false;
        };
    }, []);

    // Re-fit when panel visibility changes
    useEffect(() => {
        if (bottomPanelOpen && bottomPanelTab === 'Terminal') {
            requestAnimationFrame(() => {
                try { fitAddon.current?.fit(); } catch(e) {}
            });
        }
    }, [bottomPanelOpen, bottomPanelTab]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isDragging.current = true;
        document.body.style.cursor = 'row-resize';
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return;
            
            // Calculate new height (window height - mouse Y)
            const newHeight = window.innerHeight - e.clientY;
            const constrainedHeight = Math.min(Math.max(newHeight, 120), window.innerHeight * 0.8);
            
            setBottomPanelHeight(constrainedHeight);

            requestAnimationFrame(() => {
                if (bottomPanelTab === 'Terminal') {
                    try { fitAddon.current?.fit(); } catch(e) {}
                }
            });
        };

        const handleMouseUp = () => {
            if (isDragging.current) {
                isDragging.current = false;
                document.body.style.cursor = 'default';
                if (bottomPanelTab === 'Terminal') {
                    try { fitAddon.current?.fit(); } catch(e) {}
                }
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [setBottomPanelHeight, bottomPanelTab]);

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.stopPropagation();
        const newHeight = bottomPanelHeight + (e.deltaY > 0 ? -30 : 30);
        const constrainedHeight = Math.min(Math.max(newHeight, 120), window.innerHeight * 0.8);
        setBottomPanelHeight(constrainedHeight);

        requestAnimationFrame(() => {
            if (bottomPanelTab === 'Terminal') {
                try { fitAddon.current?.fit(); } catch(e) {}
            }
        });
    }, [bottomPanelHeight, bottomPanelTab, setBottomPanelHeight]);

    return (
        <div 
            style={{ height: bottomPanelOpen ? bottomPanelHeight : 24 }} 
            className={`absolute bottom-0 left-0 right-0 z-50 border-t border-ide-border bg-ide-panel flex flex-col shadow-2xl ${!bottomPanelOpen ? 'cursor-pointer hover:bg-ide-hover transition-colors overflow-hidden' : ''}`}
            onClick={!bottomPanelOpen ? () => setBottomPanelState(true) : undefined}
        >
            {/* If closed, show simple header */}
            {!bottomPanelOpen && (
                <div className="flex items-center px-4 h-full w-full">
                    <ChevronUp size={12} className="text-ide-text-muted mr-2" />
                    <span className="text-[11px] text-ide-text-muted uppercase tracking-wide">Terminal</span>
                </div>
            )}
            
            <div 
                className={!bottomPanelOpen ? "hidden" : "h-2 bg-transparent hover:bg-ide-accent cursor-row-resize absolute -top-1 left-0 right-0 z-50"} 
                onMouseDown={handleMouseDown}
                onWheel={handleWheel}
            />
            
            <div className={!bottomPanelOpen ? "hidden" : "flex flex-col shrink-0 border-b border-ide-border"}>
                <div className="flex items-center justify-between px-4 h-9">
                    <div className="flex gap-4 text-[11px] uppercase tracking-wide h-full">
                        {TABS.map(tab => (
                            <div 
                                key={tab}
                                className={`cursor-pointer ${bottomPanelTab === tab ? 'border-b border-ide-accent text-ide-text-bright' : 'hover:text-ide-text-bright text-ide-text-muted'} h-full flex items-center`}
                                onClick={() => setBottomPanelState(true, tab)}
                            >
                                {tab}
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 text-ide-text-muted">
                        <Terminal size={14} className="cursor-pointer hover:text-ide-text-bright" onClick={() => setBottomPanelState(true, 'Terminal')} />
                        <PanelBottomClose 
                            size={14} 
                            className="cursor-pointer hover:text-ide-text-bright" 
                            onClick={() => setBottomPanelState(false)}
                        />
                        <X 
                            size={14} 
                            className="cursor-pointer hover:text-ide-text-bright" 
                            onClick={() => setBottomPanelState(false)}
                        />
                    </div>
                </div>

                {/* Terminal Toolbar */}
                <div className={bottomPanelTab === 'Terminal' ? "flex items-center gap-2 px-4 py-1 bg-ide-bg-darker" : "hidden"}>
                    <div className="flex items-center gap-1 bg-ide-bg border border-ide-border rounded px-2">
                        <Search size={12} className="text-ide-text-muted" />
                        <input 
                            type="text" 
                            className="bg-transparent text-ide-text text-[12px] focus:outline-none w-48 h-6"
                            placeholder="Find..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    searchAddon.current?.findNext(searchText);
                                }
                            }}
                        />
                    </div>
                    <button 
                        className="p-1 hover:bg-ide-hover rounded text-ide-text-muted hover:text-ide-text-bright"
                        onClick={() => xterm.current?.clear()}
                        title="Clear Terminal"
                    >
                        <Trash2 size={14} />
                    </button>
                    <button 
                        className="p-1 hover:bg-ide-hover rounded text-ide-text-muted hover:text-ide-text-bright"
                        onClick={() => xterm.current?.scrollToBottom()}
                        title="Scroll to Bottom"
                    >
                        <ArrowDown size={14} />
                    </button>
                </div>
            </div>
            
            <div className={`flex-1 w-full bg-ide-bg p-2 pl-4 overflow-hidden ${(!bottomPanelOpen || bottomPanelTab !== 'Terminal') ? 'hidden' : 'flex'}`}>
                <div ref={terminalRef} className="h-full w-full" />
            </div>
            
            {bottomPanelTab === 'Logcat' && (
                <div className="flex-1 overflow-hidden">
                    <LogcatView />
                </div>
            )}
            
            {bottomPanelTab === 'Build' && (
                <div className="flex-1 overflow-hidden">
                    <BuildOutputView />
                </div>
            )}
            
            {bottomPanelTab === 'Problems' && (
                <div className="flex-1 w-full flex flex-col min-h-0">
                    <ProblemsPanel />
                </div>
            )}
        </div>
    );
};

