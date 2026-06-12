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

interface WorkspaceState {
    workspaceRoot: string | null;
    fileTree: FileNode[];
    activeTab: string | null; // path of the active tab
    openedTabs: TabData[];
    showAIPanel: boolean;
    activeSidebarTab: string;
    bottomPanelOpen: boolean;
    bottomPanelTab: string;
    
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
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
    workspaceRoot: null,
    fileTree: [],
    activeTab: null,
    openedTabs: [],
    showAIPanel: false,
    activeSidebarTab: 'explorer',
    bottomPanelOpen: false,
    bottomPanelTab: 'terminal',

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
        return { openedTabs: newTabs, activeTab: newActiveTab };
    }),

    setActiveTab: (path) => set({ activeTab: path }),

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
    setBottomPanelState: (open, tab) => set((state) => ({ 
        bottomPanelOpen: open, 
        bottomPanelTab: tab || state.bottomPanelTab 
    })),
}));
