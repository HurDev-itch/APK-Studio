import React, { useState, useEffect } from 'react';
import { Blocks, ShieldAlert, Check, Upload, FolderOpen, RefreshCw, Loader2, Power, PowerOff, Package } from 'lucide-react';

interface PluginManifest {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    permissions: string[];
    enabled: boolean;
}

export const PluginsView: React.FC = () => {
    const [plugins, setPlugins] = useState<PluginManifest[]>([]);
    const [loading, setLoading] = useState(false);
    const [pendingEnable, setPendingEnable] = useState<PluginManifest | null>(null);
    const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

    const loadPlugins = async () => {
        setLoading(true);
        try {
            const res = await window.electronAPI.executeCommand('plugins.list');
            if (res.success && Array.isArray(res.data)) {
                setPlugins(res.data);
            } else {
                // No plugins registered or command not found — show empty state
                setPlugins([]);
            }
        } catch (e) {
            console.error(e);
            setPlugins([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPlugins();
    }, []);

    const togglePlugin = async (plugin: PluginManifest) => {
        if (plugin.enabled) {
            await window.electronAPI.executeCommand('plugins.disable', plugin.id);
            loadPlugins();
        } else {
            setPendingEnable(plugin);
        }
    };

    const confirmEnable = async () => {
        if (!pendingEnable) return;
        await window.electronAPI.executeCommand('plugins.enable', pendingEnable.id);
        setPendingEnable(null);
        loadPlugins();
    };

    const filteredPlugins = plugins.filter(p => {
        if (filter === 'enabled') return p.enabled;
        if (filter === 'disabled') return !p.enabled;
        return true;
    });

    return (
        <div className="h-full bg-ide-bg text-ide-text flex flex-col overflow-hidden relative">
            {/* Header */}
            <div className="shrink-0 border-b border-ide-border bg-ide-surface p-6 pb-4">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl font-light text-white mb-1 flex items-center gap-3">
                        <Blocks size={24} className="text-ide-accent" />
                        Extensions
                    </h2>
                    <p className="text-sm text-ide-text-muted mb-4">Manage installed plugins and features.</p>
                    
                    {/* Search & Filter Bar */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 flex items-center bg-ide-bg border border-ide-border rounded px-3 py-1.5 focus-within:border-ide-accent transition-colors">
                            <input 
                                type="text" 
                                placeholder="Search extensions..." 
                                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-ide-text-muted/50"
                            />
                        </div>
                        
                        <div className="flex bg-ide-bg border border-ide-border rounded overflow-hidden">
                            {(['all', 'enabled', 'disabled'] as const).map(f => (
                                <button
                                    key={f}
                                    className={`px-3 py-1.5 text-xs capitalize transition-colors ${filter === f ? 'bg-ide-accent text-white' : 'text-ide-text-muted hover:text-white hover:bg-ide-hover'}`}
                                    onClick={() => setFilter(f)}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={loadPlugins}
                            disabled={loading}
                            className="p-1.5 rounded border border-ide-border text-ide-text-muted hover:text-white hover:bg-ide-hover transition-colors"
                            title="Reload Extensions"
                        >
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Plugin List */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl mx-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 text-ide-text-muted">
                            <Loader2 size={24} className="animate-spin mr-3" />
                            Loading extensions...
                        </div>
                    ) : filteredPlugins.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <Package size={48} className="text-ide-text-muted/30 mb-4" />
                            <h3 className="text-lg text-ide-text-muted mb-2">
                                {plugins.length === 0 ? 'No Extensions Installed' : 'No matching extensions'}
                            </h3>
                            <p className="text-sm text-ide-text-muted/70 max-w-md mb-6">
                                {plugins.length === 0 
                                    ? 'Extensions add new features and capabilities to APK Studio. Install extensions from ZIP files or folders.'
                                    : 'Try a different filter or search term.'
                                }
                            </p>
                            {plugins.length === 0 && (
                                <div className="flex gap-3">
                                    <button className="flex items-center gap-2 px-4 py-2 bg-ide-accent text-white rounded hover:bg-ide-accent/90 transition-colors text-sm">
                                        <Upload size={16} /> Install from ZIP
                                    </button>
                                    <button className="flex items-center gap-2 px-4 py-2 bg-ide-surface border border-ide-border text-ide-text-bright rounded hover:bg-ide-hover transition-colors text-sm">
                                        <FolderOpen size={16} /> Install from Folder
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredPlugins.map((p) => (
                                <div key={p.id} className="bg-ide-surface border border-ide-border rounded-lg p-4 flex items-start gap-4 hover:border-[#3e3e42] transition-colors group">
                                    {/* Plugin Icon */}
                                    <div className="w-12 h-12 rounded-lg bg-ide-bg border border-ide-border flex items-center justify-center shrink-0">
                                        <Blocks size={24} className="text-ide-accent/60" />
                                    </div>
                                    
                                    {/* Plugin Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-white font-medium">{p.name}</h3>
                                            <span className="text-[11px] text-ide-text-muted font-mono bg-ide-bg px-1.5 py-0.5 rounded">v{p.version}</span>
                                            <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded font-semibold ${p.enabled ? 'bg-green-500/20 text-green-400' : 'bg-[#3e3e42] text-ide-text-muted'}`}>
                                                {p.enabled ? 'Enabled' : 'Disabled'}
                                            </span>
                                        </div>
                                        <p className="text-[13px] text-ide-text-muted mb-2 line-clamp-2">{p.description}</p>
                                        <div className="text-[11px] text-ide-text-muted/70">
                                            By <span className="text-ide-text-muted">{p.author}</span>
                                            {p.permissions.length > 0 && (
                                                <span className="ml-3">
                                                    Permissions: {p.permissions.join(', ')}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <button 
                                        className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                                            p.enabled 
                                                ? 'text-ide-text-muted hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30' 
                                                : 'bg-ide-accent text-white hover:bg-ide-accent/90'
                                        }`}
                                        onClick={() => togglePlugin(p)}
                                    >
                                        {p.enabled ? <><PowerOff size={14} /> Disable</> : <><Power size={14} /> Enable</>}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Install Actions (always visible at bottom when plugins exist) */}
                    {plugins.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-ide-border flex items-center gap-3">
                            <button className="flex items-center gap-2 px-3 py-1.5 bg-ide-surface border border-ide-border text-ide-text-muted rounded hover:text-white hover:bg-ide-hover transition-colors text-xs">
                                <Upload size={14} /> Install from ZIP
                            </button>
                            <button className="flex items-center gap-2 px-3 py-1.5 bg-ide-surface border border-ide-border text-ide-text-muted rounded hover:text-white hover:bg-ide-hover transition-colors text-xs">
                                <FolderOpen size={14} /> Install from Folder
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Permissions Gateway Modal */}
            {pendingEnable && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#1e1e1e] border border-ide-border rounded-lg shadow-2xl w-[400px] overflow-hidden">
                        <div className="px-4 py-3 border-b border-ide-border flex items-center gap-2 bg-[#252526]">
                            <ShieldAlert size={18} className="text-yellow-400" />
                            <span className="text-white font-medium text-sm">Permissions Gateway</span>
                        </div>
                        <div className="p-4 text-[13px] space-y-4">
                            <p>
                                The plugin <strong className="text-white">{pendingEnable.name}</strong> is requesting the following capabilities:
                            </p>
                            <div className="bg-[#2d2d2d] rounded border border-[#3e3e42] p-3 space-y-2">
                                {pendingEnable.permissions.map((perm: string) => (
                                    <div key={perm} className="flex items-center gap-2">
                                        <Check size={14} className="text-green-400" />
                                        <span className="font-mono text-ide-text-bright capitalize">{perm} Access</span>
                                    </div>
                                ))}
                                {pendingEnable.permissions.length === 0 && (
                                    <div className="text-ide-text-muted italic">No special permissions requested.</div>
                                )}
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button 
                                    className="px-4 py-1.5 rounded bg-[#3e3e42] text-white hover:bg-[#4e4e52] transition-colors"
                                    onClick={() => setPendingEnable(null)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    className="px-4 py-1.5 rounded bg-ide-accent text-white hover:bg-opacity-90 transition-colors"
                                    onClick={confirmEnable}
                                >
                                    Approve & Enable
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
