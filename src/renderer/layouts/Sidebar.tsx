import { ChevronRight, ChevronDown, FolderClosed, FolderOpen, FileCode, FileJson, FileText, File, FileImage } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import { List } from 'react-window';
import { useWorkspaceStore } from '../store/workspaceStore';
import type { FileNode } from '../store/workspaceStore';
import { BuildPanel } from './BuildPanel';
import { SearchPanel } from './SearchPanel';
import { EmulatorPanel } from './EmulatorPanel';
import { SDKManagerPanel } from './SDKManagerPanel';

const getFileIcon = (fileName: string) => {
    const lowerName = fileName.toLowerCase();
    if (lowerName.endsWith('.java') || lowerName.endsWith('.kt') || lowerName.endsWith('.smali')) return <FileCode size={16} className="text-blue-400" />;
    if (lowerName.endsWith('.xml') || lowerName.endsWith('.json')) return <FileJson size={16} className="text-yellow-400" />;
    if (lowerName.endsWith('.txt') || lowerName.endsWith('.md')) return <FileText size={16} className="text-gray-300" />;
    if (lowerName.endsWith('.db') || lowerName.endsWith('.sqlite')) return <File size={16} className="text-purple-400" />;
    if (lowerName.match(/\.(png|jpe?g|webp|svg|gif)$/i)) return <FileImage size={16} className="text-green-400" />;
    return <File size={16} className="text-ide-text-muted" />;
};

const getParentPath = (p: string) => {
    const sep = p.includes('\\') ? '\\' : '/';
    return p.substring(0, p.lastIndexOf(sep));
};

interface ContextMenuState {
    x: number;
    y: number;
    node: FileNode;
}

interface ActionDialogState {
    action: 'new-file' | 'new-folder' | 'rename';
    node: FileNode;
}

const ContextMenu = ({ x, y, node, onClose, onAction }: any) => {
    useEffect(() => {
        const handleClick = () => onClose();
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [onClose]);

    const isFolder = node.isDirectory;
    const items = isFolder 
        ? ['New File', 'New Folder', 'Rename', 'Delete', 'Copy Path', 'Reveal in Explorer']
        : ['Open', 'Rename', 'Delete', 'Duplicate', 'Copy Path', 'Reveal in Explorer'];

    return (
        <div 
            className="fixed z-50 py-1 text-ide-text-bright shadow-lg border text-xs bg-[#252526] border-[#3e3e42]"
            style={{ top: y, left: x, minWidth: '160px' }}
            onContextMenu={e => e.preventDefault()}
        >
            {items.map(item => (
                <div 
                    key={item}
                    className="px-6 py-[6px] cursor-pointer hover:bg-[#094771]"
                    onClick={(e) => {
                        e.stopPropagation();
                        onAction(item.toLowerCase().replace(/ /g, '-'));
                        onClose();
                    }}
                >
                    {item}
                </div>
            ))}
        </div>
    );
};

const ActionDialog = ({ actionDialog, onClose }: any) => {
    const { action, node } = actionDialog;
    const [name, setName] = useState(action === 'rename' ? node.name : '');

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) return;

        const parentPath = (action === 'rename' || !node.isDirectory) ? getParentPath(node.path) : node.path;
        const sep = parentPath.includes('\\') ? '\\' : '/';
        const targetPath = `${parentPath}${sep}${name}`;

        if (action === 'new-file') {
            let content = '';
            if (name.endsWith('.xml')) content = '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n</resources>';
            else if (name.endsWith('.java')) {
                const className = name.replace('.java', '');
                content = `public class ${className} {\n\n}`;
            }
            else if (name.endsWith('.kt')) {
                const className = name.replace('.kt', '');
                content = `class ${className} {\n\n}`;
            }
            else if (name.endsWith('.smali')) {
                const className = name.replace('.smali', '');
                content = `.class public L${className};\n.super Ljava/lang/Object;\n`;
            }
            await window.electronAPI.executeCommand('fs.createFile', { parentDir: parentPath, name, content });
        } else if (action === 'new-folder') {
            await window.electronAPI.executeCommand('fs.createDirectory', targetPath);
        } else if (action === 'rename') {
            await window.electronAPI.executeCommand('fs.rename', { oldPath: node.path, newPath: targetPath });
        }

        window.dispatchEvent(new CustomEvent('refresh-dir', { detail: parentPath }));
        onClose();
    };

    const title = action === 'new-file' ? 'New File' : action === 'new-folder' ? 'New Folder' : 'Rename';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-[#252526] border border-[#3e3e42] p-4 rounded shadow-lg w-80 text-ide-text-bright">
                <h3 className="mb-3 text-sm font-semibold">{title}</h3>
                <form onSubmit={onSubmit}>
                    <input 
                        type="text" 
                        autoFocus
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        className="w-full bg-[#3c3c3c] text-ide-text-bright border border-[#3e3e42] px-2 py-1 text-sm outline-none focus:border-[#007fd4]"
                    />
                    <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={onClose} className="px-3 py-1 text-xs hover:bg-[#3c3c3c] rounded">Cancel</button>
                        <button type="submit" className="px-3 py-1 text-xs bg-[#007fd4] text-white rounded hover:bg-[#006abc]">Confirm</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const Sidebar = () => {
    const { workspaceRoot, fileTree, setFileTree, activeSidebarTab, openTab } = useWorkspaceStore();
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const [actionDialog, setActionDialog] = useState<ActionDialogState | null>(null);
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
    const [dirCache, setDirCache] = useState<Record<string, FileNode[]>>({});

    // Flatten tree for react-window
    const flatTree = useMemo(() => {
        const result: any[] = [];
        
        const traverse = (nodes: FileNode[], level: number) => {
            for (const node of nodes) {
                const isOpen = expandedPaths.has(node.path);
                result.push({ node, level, isOpen });
                if (isOpen && dirCache[node.path]) {
                    traverse(dirCache[node.path], level + 1);
                }
            }
        };
        
        traverse(fileTree, 0);
        return result;
    }, [fileTree, expandedPaths, dirCache]);

    const toggleOpen = async (node: FileNode) => {
        if (!node.isDirectory) {
            if (node.name.match(/\.(db|sqlite|png|jpe?g|webp|svg|gif)$/i)) {
                openTab(node.path, node.name, ''); 
                return;
            }
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

        const newExpanded = new Set(expandedPaths);
        if (newExpanded.has(node.path)) {
            newExpanded.delete(node.path);
            setExpandedPaths(newExpanded);
        } else {
            if (!dirCache[node.path]) {
                try {
                    const response = await window.electronAPI.executeCommand('fs.readDir', node.path);
                    if (response.success) {
                        setDirCache(prev => ({ ...prev, [node.path]: response.data }));
                    }
                } catch (e) {
                    console.error("Failed to read dir", e);
                }
            }
            newExpanded.add(node.path);
            setExpandedPaths(newExpanded);
        }
    };

    const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, node });
    };

    // Row renderer for react-window v2
    const RowComponent = ({ index, style }: { index: number, style: React.CSSProperties }) => {
        const { node, level, isOpen } = flatTree[index];
        return (
            <div style={style}>
                <div 
                    className="py-[3px] px-2 hover:bg-ide-hover cursor-pointer flex items-center gap-[6px] h-full"
                    style={{ paddingLeft: `${level * 12 + 16}px` }}
                    onClick={() => toggleOpen(node)}
                    onContextMenu={(e) => handleContextMenu(e, node)}
                >
                    {node.isDirectory ? (
                        isOpen ? <ChevronDown size={16} className="text-ide-text-muted shrink-0" /> : <ChevronRight size={16} className="text-ide-text-muted shrink-0" />
                    ) : (
                        <div className="w-4 shrink-0" /> // spacer
                    )}
                    
                    {node.isDirectory ? (
                        isOpen ? <FolderOpen size={16} className="text-ide-text-muted shrink-0" fill="currentColor" fillOpacity={0.2} /> : <FolderClosed size={16} className="text-ide-text-muted shrink-0" fill="currentColor" fillOpacity={0.2} />
                    ) : (
                        getFileIcon(node.name)
                    )}
                    
                    <span className="truncate">{node.name}</span>
                </div>
            </div>
        );
    };

    const handleContextMenuAction = async (action: string) => {
        if (!contextMenu) return;
        const { node } = contextMenu;
        const parentPath = getParentPath(node.path);

        switch (action) {
            case 'new-file':
            case 'new-folder':
            case 'rename':
                setActionDialog({ action: action as any, node });
                break;
            case 'delete':
                await window.electronAPI.executeCommand('fs.delete', node.path);
                window.dispatchEvent(new CustomEvent('refresh-dir', { detail: parentPath }));
                break;
            case 'duplicate': {
                const sep = node.path.includes('\\') ? '\\' : '/';
                const parts = node.name.split('.');
                const ext = parts.length > 1 ? `.${parts.pop()}` : '';
                const base = parts.join('.');
                const targetPath = `${parentPath}${sep}${base}_copy${ext}`;
                await window.electronAPI.executeCommand('fs.duplicate', { sourcePath: node.path, targetPath });
                window.dispatchEvent(new CustomEvent('refresh-dir', { detail: parentPath }));
                break;
            }
            case 'copy-path':
                navigator.clipboard.writeText(node.path);
                break;
            case 'reveal-in-explorer':
                await window.electronAPI.executeCommand('fs.showInExplorer', node.path);
                break;
            case 'open':
                if (!node.isDirectory) {
                    if (node.name.match(/\.(db|sqlite|png|jpe?g|webp|svg|gif)$/i)) {
                        openTab(node.path, node.name, ''); 
                    } else {
                        const response = await window.electronAPI.executeCommand('fs.readFile', node.path);
                        if (response.success) {
                            openTab(node.path, node.name, response.data);
                        }
                    }
                }
                break;
        }
    };

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

        const handleRefresh = async (e: Event) => {
            const customEvent = e as CustomEvent;
            const targetPath = customEvent.detail;
            
            if (targetPath === workspaceRoot) {
                loadRoot();
            } else if (expandedPaths.has(targetPath)) {
                try {
                    const response = await window.electronAPI.executeCommand('fs.readDir', targetPath);
                    if (response.success) {
                        setDirCache(prev => ({ ...prev, [targetPath]: response.data }));
                    }
                } catch (e) {
                    console.error("Failed to read dir during refresh", e);
                }
            }
        };
        window.addEventListener('refresh-dir', handleRefresh);

        // Listen for FS_EVENT from chokidar
        const unsubscribe = window.electronAPI.onEvent((event) => {
            if (event.type === 'FS_EVENT') {
                const { filePath } = event.payload;
                const parentPath = getParentPath(filePath);
                window.dispatchEvent(new CustomEvent('refresh-dir', { detail: parentPath }));
            }
        });

        return () => {
            window.removeEventListener('refresh-dir', handleRefresh);
            unsubscribe();
        };
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
                    <div className="flex-1 overflow-hidden font-mono text-[13px]">
                        <List
                            rowCount={flatTree.length}
                            rowHeight={24}
                            rowComponent={RowComponent}
                            rowProps={{} as any}
                            style={{ height: '100%', width: '100%', overflowX: 'hidden' }}
                        />
                    </div>
                </>
            )}

            {activeSidebarTab === 'search' && (
                <SearchPanel />
            )}

            {activeSidebarTab === 'build' && (
                <BuildPanel />
            )}

            {activeSidebarTab === 'device' && (
                <EmulatorPanel />
            )}

            {activeSidebarTab === 'sdk' && (
                <SDKManagerPanel />
            )}

            {contextMenu && (
                <ContextMenu 
                    {...contextMenu} 
                    onClose={() => setContextMenu(null)} 
                    onAction={handleContextMenuAction} 
                />
            )}

            {actionDialog && (
                <ActionDialog 
                    actionDialog={actionDialog} 
                    onClose={() => setActionDialog(null)} 
                />
            )}
        </div>
    );
};
