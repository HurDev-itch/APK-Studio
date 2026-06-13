import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, Bot, FileText, Bug, Zap, Folder, File, Save, Settings, Wrench, GitMerge, Layout, Blocks, TerminalSquare } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';

interface CommandItem {
    id: string;
    title: string;
    shortcut?: string;
    icon: React.ReactNode;
    action: () => void;
}

export const CommandPalette: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const { 
        activeTab, toggleAIPanel, openedTabs, workspaceRoot, 
        setActiveSidebarTab, setBottomPanelState, bottomPanelOpen 
    } = useWorkspaceStore();
    const inputRef = useRef<HTMLInputElement>(null);

    const runAICommand = async (promptMsg: string) => {
        setIsOpen(false);
        if (!useWorkspaceStore.getState().showAIPanel) {
            toggleAIPanel();
        }
        await window.electronAPI.executeCommand('ai.chat', {
            messages: [{ role: 'user', content: promptMsg }],
            context: { activeFilePath: activeTab || undefined }
        });
        toggleAIPanel();
        setTimeout(() => toggleAIPanel(), 50);
    };

    const openTab = (path: string, name: string) => {
        if (!openedTabs.find(t => t.path === path)) {
            useWorkspaceStore.setState(state => ({
                openedTabs: [...state.openedTabs, { name, path, content: '', isDirty: false }]
            }));
        }
        useWorkspaceStore.getState().setActiveTab(path);
    };

    const saveFile = async () => {
        if (!activeTab) return;
        const activeTabData = openedTabs.find(t => t.path === activeTab);
        if (!activeTabData) return;
        await window.electronAPI.executeCommand('fs.writeFile', {
            filePath: activeTab,
            content: activeTabData.content
        });
        useWorkspaceStore.getState().markTabClean(activeTab);
    };

    const saveAll = async () => {
        for (const tab of openedTabs) {
            if (tab.isDirty) {
                await window.electronAPI.executeCommand('fs.writeFile', {
                    filePath: tab.path,
                    content: tab.content
                });
                useWorkspaceStore.getState().markTabClean(tab.path);
            }
        }
    };

    const buildApk = () => {
        if (!workspaceRoot) return;
        setBottomPanelState(true, 'Terminal');
        window.electronAPI.executeCommand('build.run', {
            workspacePath: workspaceRoot,
            outputApkPath: `${workspaceRoot}/dist/app_release.apk`
        });
    };

    const commands: CommandItem[] = [
        // File Commands
        { id: 'file.newWorkspace', title: 'File: New Workspace...', shortcut: 'Ctrl+N', icon: <Folder size={16} />, action: () => {} },
        { id: 'file.openWorkspace', title: 'File: Open Workspace...', shortcut: 'Ctrl+O', icon: <Folder size={16} />, action: async () => {
            const res = await window.electronAPI.executeCommand('workspace.selectDirectory');
            if (res.success && res.data) {
                const openRes = await window.electronAPI.executeCommand('workspace.openByPath', res.data);
                if (openRes.success && openRes.data?.metadata) {
                    useWorkspaceStore.getState().setWorkspaceRoot(openRes.data.metadata.path);
                }
            }
        }},
        { id: 'file.openApk', title: 'File: Open APK...', icon: <File size={16} />, action: async () => {
            const res = await window.electronAPI.executeCommand('apk.openDialog');
            if (res.success && res.data) {
                const outDirRes = await window.electronAPI.executeCommand('workspace.selectDirectory');
                if (outDirRes.success && outDirRes.data) {
                    setBottomPanelState(true, 'Terminal');
                    const decompileRes = await window.electronAPI.executeCommand('apktool.decompile', {
                        apkPath: res.data, outputDir: outDirRes.data
                    });
                    if (decompileRes.success) {
                        const projectName = (res.data as string).split(/[\\/]/).pop()?.replace(/\.apk$/i, '') || 'project';
                        const createRes = await window.electronAPI.executeCommand('workspace.create', { targetDir: outDirRes.data, projectName, initGit: false });
                        if (createRes.success && createRes.data?.metadata) useWorkspaceStore.getState().setWorkspaceRoot(createRes.data.metadata.path);
                    }
                }
            }
        }},
        { id: 'file.save', title: 'File: Save', shortcut: 'Ctrl+S', icon: <Save size={16} />, action: saveFile },
        { id: 'file.saveAll', title: 'File: Save All', shortcut: 'Ctrl+Shift+S', icon: <Save size={16} />, action: saveAll },
        { id: 'file.closeWorkspace', title: 'File: Close Workspace', icon: <Folder size={16} />, action: () => useWorkspaceStore.getState().setWorkspaceRoot(null as any) },
        
        // Edit Commands
        { id: 'edit.undo', title: 'Edit: Undo', shortcut: 'Ctrl+Z', icon: <FileText size={16} />, action: () => document.execCommand('undo') },
        { id: 'edit.redo', title: 'Edit: Redo', shortcut: 'Ctrl+Y', icon: <FileText size={16} />, action: () => document.execCommand('redo') },
        { id: 'edit.find', title: 'Edit: Find', shortcut: 'Ctrl+F', icon: <Search size={16} />, action: () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true })) },
        { id: 'edit.replace', title: 'Edit: Replace', shortcut: 'Ctrl+H', icon: <Search size={16} />, action: () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', ctrlKey: true })) },
        
        // View Commands
        { id: 'view.explorer', title: 'View: Toggle Explorer', icon: <Layout size={16} />, action: () => setActiveSidebarTab('explorer') },
        { id: 'view.search', title: 'View: Toggle Search', shortcut: 'Ctrl+Shift+F', icon: <Search size={16} />, action: () => setActiveSidebarTab('search') },
        { id: 'view.terminal', title: 'View: Toggle Terminal', shortcut: 'Ctrl+`', icon: <TerminalSquare size={16} />, action: () => setBottomPanelState(!bottomPanelOpen, 'Terminal') },
        { id: 'view.aiPanel', title: 'View: Toggle AI Panel', icon: <Bot size={16} />, action: toggleAIPanel },
        
        // Run Commands
        { id: 'run.buildApk', title: 'Run: Build APK', shortcut: 'Ctrl+B', icon: <GitMerge size={16} />, action: buildApk },
        
        // Tools & Plugins Commands
        { id: 'tools.apkAnalyzer', title: 'Tools: APK Analyzer', icon: <Wrench size={16} />, action: () => openTab('APKAnalyzer', 'Analyzer') },
        { id: 'plugins.extensions', title: 'Plugins: Extensions', icon: <Blocks size={16} />, action: () => openTab('Plugins', 'Extensions') },
        { id: 'help.about', title: 'Help: About APK Studio', icon: <Settings size={16} />, action: () => openTab('About', 'About') },

        // AI Commands
        { id: 'ai.explain.file', title: 'AI: Explain Current File', icon: <Bot size={16} className="text-purple-400" />, action: () => runAICommand("Please explain the purpose and logic of this file.") },
        { id: 'ai.find.bugs', title: 'AI: Find Bugs in File', icon: <Bug size={16} className="text-red-400" />, action: () => runAICommand("Please analyze this code and identify any potential bugs, security issues, or performance bottlenecks.") },
        { id: 'ai.analyze.manifest', title: 'AI: Analyze AndroidManifest.xml', icon: <FileText size={16} className="text-green-400" />, action: () => {
            if (activeTab?.endsWith('AndroidManifest.xml')) {
                runAICommand("Analyze this AndroidManifest.xml for potential security vulnerabilities, misconfigurations, or unnecessary permissions.");
            } else {
                alert("Please open AndroidManifest.xml first.");
            }
        }},
        { id: 'ai.optimize.resources', title: 'AI: Optimize Resources', icon: <Zap size={16} className="text-yellow-400" />, action: () => runAICommand("Suggest optimizations for the resources defined in this file.") }
    ];

    // Global Keyboard Shortcuts
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
                e.preventDefault();
                setIsOpen(prev => !prev);
                setQuery('');
            } else if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            } else if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                saveFile();
            } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                saveAll();
            } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
                e.preventDefault();
                setActiveSidebarTab('search');
            } else if (e.ctrlKey && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                buildApk();
            } else if (e.ctrlKey && e.key === '`') {
                e.preventDefault();
                useWorkspaceStore.getState().setBottomPanelState(!useWorkspaceStore.getState().bottomPanelOpen, 'Terminal');
            }
            // Note: Ctrl+F and Ctrl+H are usually handled by Monaco itself or the DOM automatically
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [isOpen, activeTab, openedTabs, workspaceRoot]); // Dependencies are important for capturing latest state in shortcuts

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setSelectedIndex(0);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const filteredCommands = commands.filter(cmd => cmd.title.toLowerCase().includes(query.toLowerCase()));

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredCommands[selectedIndex]) {
                filteredCommands[selectedIndex].action();
                setIsOpen(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-center items-start pt-20 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
            <div 
                className="w-[600px] bg-[#1e1e1e] border border-ide-border shadow-2xl rounded-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center px-4 py-3 border-b border-ide-border gap-3">
                    <Search size={18} className="text-ide-text-muted" />
                    <input 
                        ref={inputRef}
                        type="text"
                        className="flex-1 bg-transparent border-none outline-none text-white text-[15px] placeholder:text-ide-text-muted placeholder:font-light"
                        placeholder="Type a command..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <div className="flex items-center gap-1 text-[10px] text-ide-text-muted font-mono bg-[#2d2d2d] px-1.5 py-0.5 rounded border border-[#3e3e42]">
                        <Command size={10} /> Esc
                    </div>
                </div>
                
                <div className="max-h-[300px] overflow-y-auto p-2">
                    {filteredCommands.length === 0 ? (
                        <div className="p-4 text-center text-sm text-ide-text-muted">No commands found.</div>
                    ) : (
                        filteredCommands.map((cmd, idx) => (
                            <div 
                                key={cmd.id}
                                className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors ${idx === selectedIndex ? 'bg-ide-accent text-white' : 'text-ide-text hover:bg-ide-hover'}`}
                                onClick={() => { cmd.action(); setIsOpen(false); }}
                                onMouseEnter={() => setSelectedIndex(idx)}
                            >
                                <div className="flex items-center gap-3">
                                    {cmd.icon}
                                    <span className="text-sm">{cmd.title}</span>
                                </div>
                                {cmd.shortcut && (
                                    <span className={`text-xs ${idx === selectedIndex ? 'text-white/70' : 'text-ide-text-muted'}`}>{cmd.shortcut}</span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
