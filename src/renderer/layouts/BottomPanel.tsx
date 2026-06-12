import { Terminal, PanelBottomClose, X, ChevronUp } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import { useWorkspaceStore } from '../store/workspaceStore';
import 'xterm/css/xterm.css';

export const BottomPanel = () => {
    const { bottomPanelOpen, setBottomPanelState } = useWorkspaceStore();
    const terminalRef = useRef<HTMLDivElement>(null);
    const xterm = useRef<XTerm | null>(null);
    const fitAddon = useRef<FitAddon | null>(null);
    const initialized = useRef(false);

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
        });

        fitAddon.current = new FitAddon();
        xterm.current.loadAddon(fitAddon.current);

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
        if (bottomPanelOpen) {
            requestAnimationFrame(() => {
                try { fitAddon.current?.fit(); } catch(e) {}
            });
        }
    }, [bottomPanelOpen]);

    if (!bottomPanelOpen) {
        return (
            <div 
                className="h-6 border-t border-ide-border bg-ide-panel flex items-center px-4 cursor-pointer hover:bg-ide-hover transition-colors"
                onClick={() => setBottomPanelState(true, 'terminal')}
            >
                <ChevronUp size={12} className="text-ide-text-muted mr-2" />
                <span className="text-[11px] text-ide-text-muted uppercase tracking-wide">Terminal</span>
            </div>
        );
    }

    return (
        <div className="h-64 border-t border-ide-border bg-ide-panel flex flex-col">
            <div className="flex items-center justify-between px-4 h-9 shrink-0">
                <div className="flex gap-4 text-[11px] uppercase tracking-wide">
                    <div className="cursor-pointer hover:text-ide-text-bright text-ide-text-muted">Problems</div>
                    <div className="cursor-pointer hover:text-ide-text-bright text-ide-text-muted">Output</div>
                    <div className="cursor-pointer border-b border-ide-accent text-ide-text-bright">Terminal</div>
                </div>
                <div className="flex gap-2 text-ide-text-muted">
                    <Terminal size={14} className="cursor-pointer hover:text-ide-text-bright" />
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
            
            <div className="flex-1 w-full bg-ide-bg p-2 pl-4" ref={terminalRef}>
                {/* Xterm.js injects here */}
            </div>
        </div>
    );
};
