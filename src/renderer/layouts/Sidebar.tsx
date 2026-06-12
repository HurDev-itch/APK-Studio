import { ChevronRight, ChevronDown, FolderClosed, FolderOpen, FileCode, FileJson, FileText, File, Search, Hammer, Smartphone, Play } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import type { FileNode } from '../store/workspaceStore';
import { BuildPanel } from './BuildPanel';
import { SearchPanel } from './SearchPanel';

const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.java') || fileName.endsWith('.kt') || fileName.endsWith('.smali')) return <FileCode size={16} className="text-blue-400" />;
    if (fileName.endsWith('.xml') || fileName.endsWith('.json')) return <FileJson size={16} className="text-yellow-400" />;
    if (fileName.endsWith('.txt') || fileName.endsWith('.md')) return <FileText size={16} className="text-gray-300" />;
    if (fileName.endsWith('.db') || fileName.endsWith('.sqlite')) return <File size={16} className="text-purple-400" />;
    return <File size={16} className="text-ide-text-muted" />;
};

const FileTreeItem = ({ node, level }: { node: FileNode, level: number }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [children, setChildren] = useState<FileNode[]>([]);
    const openTab = useWorkspaceStore(state => state.openTab);

    const toggleOpen = async () => {
        if (!node.isDirectory) {
            // Check if it's a sqlite DB
            if (node.name.endsWith('.db') || node.name.endsWith('.sqlite')) {
                openTab(node.path, node.name, ''); // empty content, sqlite editor will fetch data via IPC
                return;
            }

            // Open normal file
            try {
                const response = await window.electronAPI.executeCommand('fs.readFile', node.path);
                if (response.success) {
                    openTab(node.path, node.name, response.data);
                }
            } catch (e) {
                console.error("Failed to read file", e);
            }
            return;
        }

        if (!isOpen && children.length === 0) {
            try {
                const response = await window.electronAPI.executeCommand('fs.readDir', node.path);
                if (response.success) {
                    setChildren(response.data);
                }
            } catch (e) {
                console.error("Failed to read dir", e);
            }
        }
        setIsOpen(!isOpen);
    };

    return (
        <div>
            <div 
                className="py-[3px] px-2 hover:bg-ide-hover cursor-pointer flex items-center gap-[6px]"
                style={{ paddingLeft: `${level * 12 + 16}px` }}
                onClick={toggleOpen}
            >
                {node.isDirectory ? (
                    isOpen ? <ChevronDown size={16} className="text-ide-text-muted" /> : <ChevronRight size={16} className="text-ide-text-muted" />
                ) : (
                    <div className="w-4" /> // spacer
                )}
                
                {node.isDirectory ? (
                    isOpen ? <FolderOpen size={16} className="text-ide-text-muted" fill="currentColor" fillOpacity={0.2} /> : <FolderClosed size={16} className="text-ide-text-muted" fill="currentColor" fillOpacity={0.2} />
                ) : (
                    getFileIcon(node.name)
                )}
                
                {node.name}
            </div>
            {isOpen && children.map(child => (
                <FileTreeItem key={child.path} node={child} level={level + 1} />
            ))}
        </div>
    );
};

export const Sidebar = () => {
    const { workspaceRoot, fileTree, setFileTree, activeSidebarTab } = useWorkspaceStore();

    useEffect(() => {
        if (!workspaceRoot) return;
        
        const loadRoot = async () => {
            try {
                const response = await window.electronAPI.executeCommand('fs.readDir', workspaceRoot);
                if (response.success) {
                    setFileTree(response.data);
                }
            } catch (e) {
                console.error("Failed to read root", e);
            }
        };
        
        loadRoot();

        // Listen for FS_EVENT from chokidar
        const unsubscribe = window.electronAPI.onEvent((event) => {
            if (event.type === 'FS_EVENT') {
                // In a real implementation, we would selectively update the tree.
                // For Phase 3, we just reload root if it's a top-level change, or let the user refresh.
                // Doing a full reload on every FS_EVENT is expensive, so we skip it or debounce it.
            }
        });

        return () => unsubscribe();
    }, [workspaceRoot, setFileTree]);

    return (
        <div className="w-64 bg-ide-surface border-r border-ide-border flex flex-col">
            {activeSidebarTab === 'explorer' && (
                <>
                    <div className="text-[11px] uppercase font-semibold text-ide-text-muted px-4 py-2 tracking-wider flex items-center justify-between">
                        <span>Explorer</span>
                        <span className="text-xl leading-none mb-1 cursor-pointer hover:text-ide-text-bright">...</span>
                    </div>
                    
                    {/* Project Title */}
                    <div className="text-xs font-bold px-1 py-1 flex items-center gap-1 cursor-pointer hover:bg-ide-hover">
                        <ChevronDown size={16} /> WORKSPACE
                    </div>

                    {/* File tree */}
                    <div className="flex-1 overflow-y-auto font-mono text-[13px]">
                        {fileTree.map(node => (
                            <FileTreeItem key={node.path} node={node} level={0} />
                        ))}
                    </div>
                </>
            )}

            {activeSidebarTab === 'search' && (
                <SearchPanel />
            )}

            {activeSidebarTab === 'build' && (
                <BuildPanel />
            )}
        </div>
    );
};
