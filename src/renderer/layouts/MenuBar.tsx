import React, { useState, useEffect, useRef } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';

interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
}

interface MenuDropdown {
  id: string;
  label: string;
  items: MenuItem[];
}

export const MenuBar: React.FC = () => {
  const { 
    setActiveSidebarTab, 
    setBottomPanelState, 
    bottomPanelOpen, 
    toggleAIPanel, 
    workspaceRoot, 
    activeTab, 
    openedTabs 
  } = useWorkspaceStore();

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openApk = async () => {
    const res = await window.electronAPI.executeCommand('apk.openDialog');
    if (!res.success || !res.data) return;
    const outDirRes = await window.electronAPI.executeCommand('workspace.selectDirectory');
    if (!outDirRes.success || !outDirRes.data) return;
    setBottomPanelState(true, 'Terminal');
    const decompileRes = await window.electronAPI.executeCommand('apktool.decompile', {
      apkPath: res.data,
      outputDir: outDirRes.data
    });
    if (decompileRes.success) {
      const apkFileName = (res.data as string).split(/[\\/]/).pop() || 'project';
      const projectName = apkFileName.replace(/\.apk$/i, '');
      const createRes = await window.electronAPI.executeCommand('workspace.create', {
        targetDir: outDirRes.data,
        projectName,
        initGit: false
      });
      if (createRes.success && createRes.data?.metadata) {
        useWorkspaceStore.getState().setWorkspaceRoot(createRes.data.metadata.path);
      }
    }
  };

  const openWorkspace = async () => {
    const res = await window.electronAPI.executeCommand('workspace.selectDirectory');
    if (!res.success || !res.data) return;
    const openRes = await window.electronAPI.executeCommand('workspace.openByPath', res.data);
    if (openRes.success && openRes.data?.metadata) {
      useWorkspaceStore.getState().setWorkspaceRoot(openRes.data.metadata.path);
    }
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

  const closeWorkspace = () => {
    // Basic implementation: set root to null
    useWorkspaceStore.getState().setWorkspaceRoot(null as any);
  };

  const buildApk = () => {
    if (!workspaceRoot) return;
    setBottomPanelState(true, 'Build');
    window.electronAPI.executeCommand('build.run', {
      workspacePath: workspaceRoot,
      outputApkPath: `${workspaceRoot}/dist/app_release.apk`
    });
  };

  const buildAndInstall = async () => {
    if (!workspaceRoot) return;
    setBottomPanelState(true, 'Build');
    try {
      const response = await window.electronAPI.executeCommand('build.run', {
        workspacePath: workspaceRoot,
        outputApkPath: `${workspaceRoot}/dist/app_release.apk`
      });
      if (response.success && response.data) {
        const distDir = response.data;
        // Find the signed APK
        const projectName = workspaceRoot.split(/[\\/]/).pop() || 'app';
        const signedApkPath = `${distDir}/${projectName}.apk`;
        
        // Wait 1s and then trigger ADB install via TERMINAL_OUTPUT or executeCommand
        window.electronAPI.publishEvent({ type: 'TERMINAL_OUTPUT', payload: `\r\n\x1b[36m$ adb install -r "${signedApkPath}"\x1b[0m\r\n` });
        window.electronAPI.executeCommand('adb.install', { apkPath: signedApkPath });
        setBottomPanelState(true, 'Terminal');
      }
    } catch (e) {
      // Build failed, handled by buildManager
    }
  };

  const openTab = (path: string, name: string) => {
    if (!openedTabs.find(t => t.path === path)) {
      useWorkspaceStore.setState(state => ({
        openedTabs: [...state.openedTabs, { name, path, content: '', isDirty: false }]
      }));
    }
    useWorkspaceStore.getState().setActiveTab(path);
  };

  const MENUS: MenuDropdown[] = [
    {
      id: 'file', label: 'File',
      items: [
        { label: 'New Workspace...', shortcut: 'Ctrl+N' },
        { label: 'Open Workspace...', shortcut: 'Ctrl+O', action: openWorkspace },
        { label: 'Open APK...', action: openApk },
        { separator: true, label: '' },
        { label: 'Save', shortcut: 'Ctrl+S', action: saveFile },
        { label: 'Save All', shortcut: 'Ctrl+Shift+S', action: saveAll },
        { separator: true, label: '' },
        { label: 'Close Workspace', action: closeWorkspace },
        { separator: true, label: '' },
        { label: 'Exit', action: () => window.electronAPI.executeCommand('window.close') }
      ]
    },
    {
      id: 'edit', label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', action: () => document.execCommand('undo') },
        { label: 'Redo', shortcut: 'Ctrl+Y', action: () => document.execCommand('redo') },
        { separator: true, label: '' },
        { label: 'Cut', shortcut: 'Ctrl+X', action: () => document.execCommand('cut') },
        { label: 'Copy', shortcut: 'Ctrl+C', action: () => document.execCommand('copy') },
        { label: 'Paste', shortcut: 'Ctrl+V', action: () => document.execCommand('paste') },
        { separator: true, label: '' },
        { label: 'Find', shortcut: 'Ctrl+F', action: () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true })) },
        { label: 'Replace', shortcut: 'Ctrl+H', action: () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', ctrlKey: true })) }
      ]
    },
    {
      id: 'selection', label: 'Selection',
      items: [
        { label: 'Select All', shortcut: 'Ctrl+A', action: () => document.execCommand('selectAll') },
        { label: 'Expand Selection' },
        { label: 'Shrink Selection' },
        { label: 'Duplicate Line' },
        { label: 'Delete Line' }
      ]
    },
    {
      id: 'view', label: 'View',
      items: [
        { label: 'Toggle Explorer', action: () => setActiveSidebarTab('explorer') },
        { label: 'Toggle Search', shortcut: 'Ctrl+Shift+F', action: () => setActiveSidebarTab('search') },
        { label: 'Toggle Terminal', shortcut: 'Ctrl+`', action: () => setBottomPanelState(!bottomPanelOpen, 'Terminal') },
        { label: 'Toggle AI Panel', action: toggleAIPanel },
        { separator: true, label: '' },
        { label: 'Command Palette...', shortcut: 'Ctrl+Shift+P', action: () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', ctrlKey: true, shiftKey: true })) }
      ]
    },
    {
      id: 'run', label: 'Run',
      items: [
        { label: 'Build APK', shortcut: 'Ctrl+B', action: buildApk },
        { label: 'Build & Sign', action: buildApk },
        { label: 'Build & Install', action: buildAndInstall },
        { label: 'Rebuild' },
        { label: 'Start Logcat' }
      ]
    },
    {
      id: 'tools', label: 'Tools',
      items: [
        { label: 'APK Analyzer', action: () => openTab('APKAnalyzer', 'Analyzer') },
        { label: 'Device Manager' },
        { label: 'Keystore Manager' },
        { label: 'Settings' }
      ]
    },
    {
      id: 'plugins', label: 'Plugins',
      items: [
        { label: 'Extensions', action: () => openTab('Plugins', 'Extensions') },
        { label: 'Installed Plugins' },
        { label: 'Marketplace' },
        { label: 'Reload Plugins' }
      ]
    },
    {
      id: 'help', label: 'Help',
      items: [
        { label: 'Documentation' },
        { label: 'Keyboard Shortcuts' },
        { label: 'Check for Updates' },
        { label: 'About APK Studio', action: () => openTab('About', 'About') }
      ]
    }
  ];

  return (
    <div className="h-7 bg-[#1e1e1e] flex items-center px-2 border-b border-[#2d2d2d] text-[#cccccc] text-[13px] select-none" ref={menuRef}>
      {MENUS.map((menu) => (
        <div key={menu.id} className="relative">
          <div 
            className={`px-2 py-0.5 rounded-md mx-0.5 cursor-pointer transition-colors ${activeMenu === menu.id ? 'bg-[#3c3c3c] text-white' : 'hover:bg-[#3c3c3c] hover:text-white'}`}
            onClick={() => setActiveMenu(activeMenu === menu.id ? null : menu.id)}
            onMouseEnter={() => { if (activeMenu) setActiveMenu(menu.id) }}
          >
            {menu.label}
          </div>
          
          {activeMenu === menu.id && (
            <div className="absolute top-full left-0 mt-1 min-w-[200px] bg-[#252526] border border-[#3e3e42] rounded shadow-xl z-50 py-1">
              {menu.items.map((item, idx) => item.separator ? (
                <div key={idx} className="h-px bg-[#3e3e42] my-1 mx-2" />
              ) : (
                <div 
                  key={idx}
                  className="flex items-center justify-between px-6 py-1 hover:bg-[#094771] hover:text-white cursor-pointer text-[#cccccc]"
                  onClick={() => {
                    item.action?.();
                    setActiveMenu(null);
                  }}
                >
                  <span>{item.label}</span>
                  {item.shortcut && <span className="text-xs text-[#808080] ml-4">{item.shortcut}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
