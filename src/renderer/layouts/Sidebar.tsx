import { ChevronRight, ChevronDown, FolderClosed, FolderOpen, FileCode, FileJson, FileText, File, FileImage } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';
import type { FileNode } from '../store/workspaceStore';
import { BuildPanel } from './BuildPanel';
import { SearchPanel } from './SearchPanel';

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

const FileTreeItem = ({ node, level, onContextMenu }: { node: FileNode, level: number, onContextMenu: (e: React.MouseEvent, node: FileNode) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [children, setChildren] = useState<FileNode[]>([]);
    const openTab = useWorkspaceStore(state => state.openTab);

    const fetchChildren = async () => {
        try {
            const response = await window.electronAPI.executeCommand('fs.readDir', node.path);
            if (response.success) {
                setChildren(response.data);
            }
        } catch (e) {
            console.error("Failed to read dir", e);
        }
    };

    useEffect(() => {
        const handleRefresh = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail === node.path && isOpen) {
                fetchChildren();
            }
        };
        window.addEventListener('refresh-dir', handleRefresh);
        return () => window.removeEventListener('refresh-dir', handleRefresh);
    }, [node.path, isOpen]);

    const toggleOpen = async () => {
        if (!node.isDirectory) {
            // Check if it's a sqlite DB or Image
            if (node.name.match(/\.(db|sqlite|png|jpe?g|webp|svg|gif)$/i)) {
                openTab(node.path, node.name, ''); // empty content
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
            await fetchChildren();
        }
        setIsOpen(!isOpen);
    };

    return (
        <div>
            <div 
                className="py-[3px] px-2 hover:bg-ide-hover cursor-pointer flex items-center gap-[6px]"
                style={{ paddingLeft: `${level * 12 + 16}px` }}
                onClick={toggleOpen}
                onContextMenu={(e) => onContextMenu(e, node)}
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
                <FileTreeItem key={child.path} node={child} level={level + 1} onContextMenu={onContextMenu} />
            ))}
        </div>
    );
};

export const Sidebar = () => {
    const { workspaceRoot, fileTree, setFileTree, activeSidebarTab, openTab } = useWorkspaceStore();
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const [actionDialog, setActionDialog] = useState<ActionDialogState | null>(null);

    const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, node });
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

        const handleRefresh = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail === workspaceRoot) {
                loadRoot();
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
                    <div className="flex-1 overflow-y-auto font-mono text-[13px]">
                        {fileTree.map(node => (
                            <FileTreeItem key={node.path} node={node} level={0} onContextMenu={handleContextMenu} />
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
