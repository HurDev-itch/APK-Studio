import { create } from 'zustand';

export interface FileNode {
    name: string;
    path: string;
    isDirectory: boolean;
    children?: FileNode[];
}

export interface TabData {
    path: string;
    name: string;
    isDirty: boolean;
    content: string;
}

export interface ProblemMarker {
    id: string;
    path: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
    line: number;
    col: number;
    source: string;
}

interface WorkspaceState {
    workspaceRoot: string | null;
    fileTree: FileNode[];
    activeTab: string | null; // path of the active tab
    openedTabs: TabData[];
    showAIPanel: boolean;
    activeSidebarTab: string;
    bottomPanelOpen: boolean;
    bottomPanelTab: string;
    bottomPanelHeight: number;
    problems: ProblemMarker[];
    
    setWorkspaceRoot: (root: string) => void;
    setFileTree: (tree: FileNode[]) => void;
    
    openTab: (path: string, name: string, content: string) => void;
    closeTab: (path: string) => void;
    setActiveTab: (path: string) => void;
    
    
    updateTabContent: (path: string, newContent: string) => void;
    markTabClean: (path: string) => void;
    toggleAIPanel: () => void;
    setActiveSidebarTab: (tab: string) => void;
    setBottomPanelState: (open: boolean, tab?: string) => void;
    setBottomPanelHeight: (height: number) => void;
    setProblems: (source: string, path: string, markers: Omit<ProblemMarker, 'id' | 'source' | 'path'>[]) => void;
    clearProblems: (source?: string, path?: string) => void;
    saveState: () => void;
    loadState: (state: any) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
    workspaceRoot: null,
    fileTree: [],
    activeTab: null,
    openedTabs: [],
    showAIPanel: false,
    activeSidebarTab: 'explorer',
    bottomPanelOpen: false,
    bottomPanelTab: 'Terminal',
    bottomPanelHeight: 200,
    problems: [],

    setWorkspaceRoot: (root) => set({ workspaceRoot: root }),
    setFileTree: (tree) => set({ fileTree: tree }),

    openTab: (path, name, content) => set((state) => {
        const exists = state.openedTabs.find(t => t.path === path);
        if (exists) {
            return { activeTab: path };
        }
        return {
            openedTabs: [...state.openedTabs, { path, name, content, isDirty: false }],
            activeTab: path
        };
    }),

    closeTab: (path) => set((state) => {
        const newTabs = state.openedTabs.filter(t => t.path !== path);
        let newActiveTab = state.activeTab;
        if (state.activeTab === path) {
            newActiveTab = newTabs.length > 0 ? newTabs[newTabs.length - 1].path : null;
        }
        
        // Async save
        setTimeout(() => get().saveState(), 0);
        return { openedTabs: newTabs, activeTab: newActiveTab };
    }),

    setActiveTab: (path) => {
        set({ activeTab: path });
        get().saveState();
    },

    updateTabContent: (path, newContent) => set((state) => ({
        openedTabs: state.openedTabs.map(t => 
            t.path === path ? { ...t, content: newContent, isDirty: true } : t
        )
    })),

    markTabClean: (path) => set((state) => ({
        openedTabs: state.openedTabs.map(t => 
            t.path === path ? { ...t, isDirty: false } : t
        )
    })),

    toggleAIPanel: () => set((state) => ({ showAIPanel: !state.showAIPanel })),
    setActiveSidebarTab: (tab) => set({ activeSidebarTab: tab }),
    setBottomPanelState: (open, tab) => {
        set((state) => ({ 
            bottomPanelOpen: open, 
            bottomPanelTab: tab || state.bottomPanelTab 
        }));
        get().saveState();
    },
    setBottomPanelHeight: (height) => {
        set({ bottomPanelHeight: height });
        // Don't save immediately on every pixel drag, use a debouncer or only save onMouseUp in the component.
        // Actually it's fine if the component calls saveState directly on drag end.
    },
    setProblems: (source, path, markers) => set((state) => {
        const otherProblems = state.problems.filter(p => !(p.source === source && p.path === path));
        const newProblems = markers.map(m => ({ ...m, source, path, id: `${source}-${path}-${m.line}-${m.col}` }));
        return { problems: [...otherProblems, ...newProblems] };
    }),
    clearProblems: (source, path) => set((state) => {
        let filtered = state.problems;
        if (source) filtered = filtered.filter(p => p.source !== source);
        if (path) filtered = filtered.filter(p => p.path !== path);
        return { problems: filtered };
    }),
    saveState: () => {
        const state = get();
        if (!state.workspaceRoot) return;
        
        window.electronAPI.executeCommand('workspace.saveState', {
            openedTabs: state.openedTabs.map(t => ({ path: t.path, name: t.name })),
            activeTab: state.activeTab,
            treeExpansion: [], // can add later
            bottomPanelHeight: state.bottomPanelHeight,
            bottomPanelTab: state.bottomPanelTab
        }).catch(err => console.error("Failed to save state", err));
    },
    loadState: (savedState: any) => {
        try {
            const parsedTabs = typeof savedState.opened_tabs === 'string' ? JSON.parse(savedState.opened_tabs) : [];
            // For each loaded tab, we'll initialize them with empty content (the editor will fetch content when activated)
            const openedTabs = parsedTabs.map((t: any) => ({ path: t.path, name: t.name, content: '', isDirty: false }));
            set({
                openedTabs,
                activeTab: savedState.active_tab || null,
                bottomPanelHeight: savedState.bottom_panel_height || 200,
                bottomPanelTab: savedState.bottom_panel_tab || 'Terminal',
            });
            // We'll need to trigger load content for the active tab, but EditorArea usually handles that when activeTab is set.
        } catch(e) {
            console.error("Failed to parse saved state", e);
        }
    }
}));
