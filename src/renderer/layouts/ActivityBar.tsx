import { FileCode2, Search, GitMerge, Blocks, Settings, CircleUser, Bot, Package, Smartphone, HardDriveDownload } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';

export const ActivityBar = () => {
    const { toggleAIPanel, showAIPanel, setActiveTab, openedTabs, activeSidebarTab, setActiveSidebarTab } = useWorkspaceStore();
    
    const openPlugins = () => {
        // Find if plugins tab exists
        if (!openedTabs.find(t => t.path === 'Plugins')) {
            useWorkspaceStore.setState(state => ({
                openedTabs: [...state.openedTabs, { name: 'Extensions', path: 'Plugins', content: '', isDirty: false }]
            }));
        }
        setActiveTab('Plugins');
    };

    const openAbout = () => {
        if (!openedTabs.find(t => t.path === 'About')) {
            useWorkspaceStore.setState(state => ({
                openedTabs: [...state.openedTabs, { name: 'About', path: 'About', content: '', isDirty: false }]
            }));
        }
        setActiveTab('About');
    };

    const openAnalyzer = () => {
        if (!openedTabs.find(t => t.path === 'APKAnalyzer')) {
            useWorkspaceStore.setState(state => ({
                openedTabs: [...state.openedTabs, { name: 'Analyzer', path: 'APKAnalyzer', content: '', isDirty: false }]
            }));
        }
        setActiveTab('APKAnalyzer');
    };
    
    return (
        <div className="w-12 bg-ide-panel border-r border-ide-border flex flex-col justify-between items-center py-2 z-10">
            <div className="flex flex-col gap-4 w-full items-center">
                <div 
                    className={`w-full flex justify-center cursor-pointer transition-colors border-l-2 ${activeSidebarTab === 'explorer' ? 'border-ide-accent text-ide-text-bright' : 'border-transparent text-ide-text-muted hover:text-ide-text-bright'}`}
                    onClick={() => setActiveSidebarTab('explorer')}
                    title="Explorer"
                >
                    <FileCode2 size={24} strokeWidth={1.5} />
                </div>
                <div 
                    className={`w-full flex justify-center cursor-pointer transition-colors border-l-2 ${activeSidebarTab === 'search' ? 'border-ide-accent text-ide-text-bright' : 'border-transparent text-ide-text-muted hover:text-ide-text-bright'}`}
                    onClick={() => setActiveSidebarTab('search')}
                    title="Search"
                >
                    <Search size={24} strokeWidth={1.5} />
                </div>
                <div 
                    className={`w-full flex justify-center cursor-pointer transition-colors border-l-2 ${activeSidebarTab === 'build' ? 'border-ide-accent text-ide-text-bright' : 'border-transparent text-ide-text-muted hover:text-ide-text-bright'}`}
                    onClick={() => setActiveSidebarTab('build')}
                    title="Build & Run"
                >
                    <GitMerge size={24} strokeWidth={1.5} />
                </div>
                <div 
                    className="w-full flex justify-center border-l-2 border-transparent text-ide-text-muted cursor-pointer hover:text-ide-text-bright transition-colors"
                    onClick={openAnalyzer}
                    title="APK Analyzer"
                >
                    <Package size={24} strokeWidth={1.5} />
                </div>
                <div 
                    className={`w-full flex justify-center cursor-pointer transition-colors border-l-2 ${activeSidebarTab === 'device' ? 'border-ide-accent text-ide-text-bright' : 'border-transparent text-ide-text-muted hover:text-ide-text-bright'}`}
                    onClick={() => setActiveSidebarTab('device')}
                    title="Device Simulator"
                >
                    <Smartphone size={24} strokeWidth={1.5} />
                </div>
                <div 
                    className={`w-full flex justify-center cursor-pointer transition-colors border-l-2 ${activeSidebarTab === 'sdk' ? 'border-ide-accent text-ide-text-bright' : 'border-transparent text-ide-text-muted hover:text-ide-text-bright'}`}
                    onClick={() => setActiveSidebarTab('sdk')}
                    title="SDK Manager"
                >
                    <HardDriveDownload size={24} strokeWidth={1.5} />
                </div>
                <div 
                    className="w-full flex justify-center border-l-2 border-transparent text-ide-text-muted cursor-pointer hover:text-ide-text-bright transition-colors"
                    onClick={openPlugins}
                    title="Extensions"
                >
                    <Blocks size={24} strokeWidth={1.5} />
                </div>
            </div>
            
            <div className="flex flex-col gap-4 w-full items-center mb-2">
                <div 
                    className={`p-3 cursor-pointer transition-colors relative group ${showAIPanel ? 'text-ide-accent border-l-2 border-ide-accent' : 'text-ide-text-muted hover:text-white border-l-2 border-transparent'}`}
                    onClick={toggleAIPanel}
                >
                    <Bot size={24} strokeWidth={1.5} />
                </div>
                <div className="w-full flex justify-center text-ide-text-muted cursor-pointer hover:text-ide-text-bright transition-colors">
                    <CircleUser size={24} strokeWidth={1.5} />
                </div>
                <div 
                    className="w-full flex justify-center text-ide-text-muted cursor-pointer hover:text-ide-text-bright transition-colors"
                    onClick={openAbout}
                    title="About APK Studio"
                >
                    <Settings size={24} strokeWidth={1.5} />
                </div>
            </div>
        </div>
    );
};
