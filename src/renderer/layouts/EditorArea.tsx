import { FileCode, FileJson, X, Play, SplitSquareHorizontal, Circle, ChevronRight } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useRef, useState } from 'react';
import { CodeEditor } from '../components/CodeEditor';
import { ManifestVisualEditor } from '../editors/ManifestVisualEditor';
import { ResourcesVisualEditor } from '../editors/ResourcesVisualEditor';
import { SqliteEditor } from '../editors/SqliteEditor';
import { SharedPreferencesEditor } from '../editors/SharedPreferencesEditor';
import { LayoutVisualEditor } from '../editors/LayoutVisualEditor';
import { ImageViewer } from '../editors/ImageViewer';
import { PluginsView } from '../components/PluginsView';
import { AboutView } from '../components/AboutView';
import { AnalyzerView } from '../components/AnalyzerView';

const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.java') || fileName.endsWith('.kt') || fileName.endsWith('.smali')) return <FileCode size={14} className="text-blue-400" />;
    if (fileName.endsWith('.xml') || fileName.endsWith('.json')) return <FileJson size={14} className="text-yellow-400" />;
    return <FileCode size={14} className="text-gray-300" />;
};

export const EditorArea = () => {
    const { openedTabs, activeTab, setActiveTab, closeTab, updateTabContent, markTabClean } = useWorkspaceStore();
    const activeTabData = openedTabs.find(t => t.path === activeTab);
    
    // Auto-save debounce timer
    const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

    // View Mode (Code vs Visual vs Split)
    const [viewMode, setViewMode] = useState<'code' | 'split' | 'visual'>('visual');

    const handleContentChange = (newContent: string) => {
        if (!activeTab) return;
        updateTabContent(activeTab, newContent);

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        
        saveTimerRef.current = setTimeout(async () => {
            try {
                await window.electronAPI.executeCommand('fs.writeFile', {
                    filePath: activeTab,
                    content: newContent,
                    isAutoSave: true
                });
                markTabClean(activeTab);
            } catch (err) {
                console.error("Auto-save failed", err);
            }
        }, 1000);
    };

    return (
        <div className="flex-1 bg-ide-bg flex flex-col">
            {/* Tabs */}
            <div className="flex bg-ide-surface overflow-x-auto no-scrollbar border-b border-ide-border">
                {openedTabs.length === 0 && (
                    <div className="px-4 py-2 text-ide-text-muted text-[13px] italic">No editors open</div>
                )}
                {openedTabs.map(tab => (
                    <div 
                        key={tab.path}
                        onClick={() => setActiveTab(tab.path)}
                        className={`flex items-center gap-2 px-3 py-2 text-[13px] cursor-pointer min-w-max group border-r border-ide-border
                            ${activeTab === tab.path ? 'bg-ide-bg border-t-2 border-t-ide-accent text-ide-text-bright' : 'text-ide-text-muted hover:bg-ide-hover border-t-2 border-t-transparent'}
                        `}
                    >
                        {getFileIcon(tab.name)}
                        {tab.name}
                        {tab.isDirty ? (
                            <div className="ml-1" onClick={(e) => { e.stopPropagation(); closeTab(tab.path); }}>
                                <Circle size={10} className="fill-ide-text-bright" />
                            </div>
                        ) : (
                            <div 
                                className="opacity-0 group-hover:opacity-100 p-[2px] rounded hover:bg-ide-hover transition-opacity"
                                onClick={(e) => { e.stopPropagation(); closeTab(tab.path); }}
                            >
                                <X size={14} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
            
            {/* Breadcrumbs & Toolbar */}
            {activeTabData && (
                <div className="h-6 flex items-center justify-between px-4 border-b border-ide-border bg-ide-bg text-[12px] text-ide-text-muted">
                    <div className="flex items-center gap-1">
                        {activeTabData.path.split(/[\/\\]/).slice(-3).map((segment, idx, arr) => (
                            <span key={idx} className="flex items-center hover:text-ide-text-bright cursor-pointer transition-colors">
                                {segment} {idx < arr.length - 1 && <ChevronRight size={14} className="mx-0.5 text-ide-text-muted" />}
                            </span>
                        ))}
                    </div>
                    <div className="flex items-center gap-3">
                        {(activeTabData.name === 'AndroidManifest.xml' || activeTabData.path.includes('shared_prefs') || (activeTabData.path.includes('res/values/') || activeTabData.path.includes('res\\values\\')) && activeTabData.name.endsWith('.xml') || (activeTabData.path.includes('res/layout/') || activeTabData.path.includes('res\\layout\\')) && activeTabData.name.endsWith('.xml')) && (
                            <div className="flex bg-[#1e1e1e] border border-[#3e3e42] rounded overflow-hidden mr-2">
                                <button 
                                    className={`px-3 py-1 text-[11px] font-medium transition-colors ${viewMode === 'code' ? 'bg-ide-accent text-white' : 'text-ide-text-muted hover:text-white'}`}
                                    onClick={() => setViewMode('code')}
                                >
                                    Code
                                </button>
                                {((activeTabData.path.includes('res/layout/') || activeTabData.path.includes('res\\layout\\')) && activeTabData.name.endsWith('.xml')) && (
                                    <button 
                                        className={`px-3 py-1 text-[11px] font-medium transition-colors ${viewMode === 'split' ? 'bg-ide-accent text-white border-l border-r border-[#3e3e42]' : 'text-ide-text-muted hover:text-white border-l border-r border-[#3e3e42]'}`}
                                        onClick={() => setViewMode('split')}
                                    >
                                        Split
                                    </button>
                                )}
                                <button 
                                    className={`px-3 py-1 text-[11px] font-medium transition-colors ${viewMode === 'visual' ? 'bg-ide-accent text-white' : 'text-ide-text-muted hover:text-white'}`}
                                    onClick={() => setViewMode('visual')}
                                >
                                    Design
                                </button>
                            </div>
                        )}
                        <Play size={14} className="cursor-pointer hover:text-ide-text-bright" />
                        <SplitSquareHorizontal size={14} className="cursor-pointer hover:text-ide-text-bright" />
                    </div>
                </div>
            )}

            {/* Editor Content */}
            <div className="flex-1 overflow-auto relative">
                {activeTabData ? (
                    <>
                        {activeTabData.path === 'About' ? (
                            <AboutView />
                        ) : activeTabData.path === 'Plugins' ? (
                            <PluginsView />
                        ) : activeTabData.path === 'APKAnalyzer' ? (
                            <AnalyzerView />
                        ) : activeTabData.name.endsWith('.db') || activeTabData.name.endsWith('.sqlite') ? (
                            <SqliteEditor path={activeTabData.path} />
                        ) : activeTabData.name === 'AndroidManifest.xml' && viewMode === 'visual' ? (
                            <ManifestVisualEditor 
                                content={activeTabData.content}
                                onChange={handleContentChange}
                            />
                        ) : (activeTabData.path.includes('res/values/') || activeTabData.path.includes('res\\values\\')) && activeTabData.name.endsWith('.xml') && viewMode === 'visual' ? (
                            <ResourcesVisualEditor
                                content={activeTabData.content}
                                onChange={handleContentChange}
                            />
                        ) : activeTabData.path.includes('shared_prefs') && viewMode === 'visual' ? (
                            <SharedPreferencesEditor
                                content={activeTabData.content}
                                onChange={handleContentChange}
                            />
                        ) : activeTabData.name.match(/\.(png|jpe?g|gif|webp|svg)$/i) ? (
                            <ImageViewer path={activeTabData.path} />
                        ) : (activeTabData.path.includes('res/layout/') || activeTabData.path.includes('res\\layout\\')) && activeTabData.name.endsWith('.xml') && viewMode !== 'code' ? (
                            <div className="h-full w-full flex">
                                {viewMode === 'split' && (
                                    <div className="flex-1 border-r border-[#3e3e42]">
                                        <CodeEditor 
                                            path={activeTabData.path}
                                            content={activeTabData.content}
                                            onChange={handleContentChange}
                                        />
                                    </div>
                                )}
                                <div className={viewMode === 'split' ? 'flex-1' : 'w-full h-full'}>
                                    <LayoutVisualEditor
                                        content={activeTabData.content}
                                        onChange={handleContentChange}
                                        viewMode={viewMode}
                                    />
                                </div>
                            </div>
                        ) : (
                            <CodeEditor 
                                path={activeTabData.path}
                                content={activeTabData.content}
                                onChange={handleContentChange}
                            />
                        )}
                    </>
                ) : (
                    <div className="h-full flex items-center justify-center text-ide-text-muted">
                        <div className="text-center">
                            <FileCode size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="text-sm">Open a file from the Explorer to start editing</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
