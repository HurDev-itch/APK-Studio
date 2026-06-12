import React, { useEffect, useState } from 'react';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

interface ManifestVisualEditorProps {
    content: string;
    onChange: (newContent: string) => void;
}

export const ManifestVisualEditor: React.FC<ManifestVisualEditorProps> = ({ content, onChange }) => {
    const [manifestData, setManifestData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Parser options to preserve attributes and maintain structure
    const parserOptions = {
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        allowBooleanAttributes: true,
        preserveOrder: true
    };

    const builderOptions = {
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        preserveOrder: true,
        format: true,
        indentBy: "    ",
        suppressEmptyNode: true
    };

    useEffect(() => {
        try {
            const parser = new XMLParser(parserOptions);
            const parsed = parser.parse(content);
            setManifestData(parsed);
            setError(null);
        } catch (err: any) {
            setError(`Failed to parse Manifest XML: ${err.message}`);
        }
    }, [content]);

    const handleSave = (newData: any) => {
        try {
            const builder = new XMLBuilder(builderOptions);
            const newXml = builder.build(newData);
            onChange(newXml);
        } catch (err: any) {
            console.error("Failed to build XML", err);
        }
    };

    // Helper to find specific node by tag name inside preserveOrder array
    const findNode = (nodes: any[], tagName: string) => {
        if (!nodes) return null;
        return nodes.find(n => Object.keys(n)[0] === tagName);
    };

    if (error) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-red-400 p-8 text-center">
                <svg className="w-12 h-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-lg font-semibold mb-2">Invalid XML</div>
                <div className="text-sm opacity-80">{error}</div>
                <div className="mt-4 text-xs text-ide-text-muted">Please fix the XML in Code mode before using the Visual Editor.</div>
            </div>
        );
    }

    if (!manifestData) {
        return <div className="p-8 text-ide-text-muted">Loading Manifest...</div>;
    }

    // Extract basic info from parsed data
    const manifestNode = findNode(manifestData, 'manifest');
    const applicationNode = manifestNode ? findNode(manifestNode.manifest, 'application') : null;
    
    // Safety check
    if (!manifestNode) {
        return <div className="p-8 text-ide-text-muted">No &lt;manifest&gt; tag found.</div>;
    }

    const attrs = manifestNode[':@'] || {};
    const appAttrs = applicationNode ? (applicationNode[':@'] || {}) : {};

    const updateAttribute = (nodeLevel: 'manifest' | 'application', attrName: string, value: string) => {
        const newData = JSON.parse(JSON.stringify(manifestData)); // deep clone
        const mNode = findNode(newData, 'manifest');
        
        if (nodeLevel === 'manifest') {
            if (!mNode[':@']) mNode[':@'] = {};
            mNode[':@'][`@_${attrName}`] = value;
        } else if (nodeLevel === 'application') {
            const aNode = findNode(mNode.manifest, 'application');
            if (aNode) {
                if (!aNode[':@']) aNode[':@'] = {};
                aNode[':@'][`@_${attrName}`] = value;
            }
        }
        
        setManifestData(newData);
        handleSave(newData);
    };

    return (
        <div className="h-full bg-ide-bg text-ide-text overflow-y-auto p-6">
            <div className="max-w-3xl mx-auto space-y-8">
                
                {/* Header */}
                <div>
                    <h2 className="text-2xl font-light text-white mb-1">Manifest Editor</h2>
                    <p className="text-sm text-ide-text-muted">Visually edit application properties and permissions.</p>
                </div>

                {/* General Settings */}
                <div className="bg-[#252526] border border-ide-border rounded-lg p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-white mb-4 border-b border-ide-border pb-2">General</h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs text-ide-text-muted mb-1">Package Name</label>
                            <input 
                                type="text" 
                                className="w-full bg-[#1e1e1e] border border-ide-border rounded px-3 py-1.5 text-sm text-white focus:border-ide-accent outline-none transition-colors"
                                value={attrs['@_package'] || ''}
                                onChange={(e) => updateAttribute('manifest', 'package', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-ide-text-muted mb-1">Compile SDK Version</label>
                            <input 
                                type="text" 
                                className="w-full bg-[#1e1e1e] border border-ide-border rounded px-3 py-1.5 text-sm text-white focus:border-ide-accent outline-none transition-colors"
                                value={attrs['@_android:compileSdkVersion'] || ''}
                                onChange={(e) => updateAttribute('manifest', 'android:compileSdkVersion', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-ide-text-muted mb-1">Version Code</label>
                            <input 
                                type="text" 
                                className="w-full bg-[#1e1e1e] border border-ide-border rounded px-3 py-1.5 text-sm text-white focus:border-ide-accent outline-none transition-colors"
                                value={attrs['@_android:versionCode'] || ''}
                                onChange={(e) => updateAttribute('manifest', 'android:versionCode', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-ide-text-muted mb-1">Version Name</label>
                            <input 
                                type="text" 
                                className="w-full bg-[#1e1e1e] border border-ide-border rounded px-3 py-1.5 text-sm text-white focus:border-ide-accent outline-none transition-colors"
                                value={attrs['@_android:versionName'] || ''}
                                onChange={(e) => updateAttribute('manifest', 'android:versionName', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Application Settings */}
                <div className="bg-[#252526] border border-ide-border rounded-lg p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-white mb-4 border-b border-ide-border pb-2">Application</h3>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className="block text-xs text-ide-text-muted mb-1">Application Label (Name)</label>
                            <input 
                                type="text" 
                                className="w-full bg-[#1e1e1e] border border-ide-border rounded px-3 py-1.5 text-sm text-white focus:border-ide-accent outline-none transition-colors"
                                value={appAttrs['@_android:label'] || ''}
                                onChange={(e) => updateAttribute('application', 'android:label', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-ide-text-muted mb-1">Application Icon</label>
                            <input 
                                type="text" 
                                className="w-full bg-[#1e1e1e] border border-ide-border rounded px-3 py-1.5 text-sm text-white focus:border-ide-accent outline-none transition-colors"
                                value={appAttrs['@_android:icon'] || ''}
                                onChange={(e) => updateAttribute('application', 'android:icon', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-ide-text-muted mb-1">Theme</label>
                            <input 
                                type="text" 
                                className="w-full bg-[#1e1e1e] border border-ide-border rounded px-3 py-1.5 text-sm text-white focus:border-ide-accent outline-none transition-colors"
                                value={appAttrs['@_android:theme'] || ''}
                                onChange={(e) => updateAttribute('application', 'android:theme', e.target.value)}
                            />
                        </div>
                        <div className="col-span-2 flex items-center gap-3">
                            <input 
                                type="checkbox" 
                                id="extractNativeLibs"
                                className="w-4 h-4 rounded border-gray-600 bg-[#1e1e1e] accent-ide-accent"
                                checked={appAttrs['@_android:extractNativeLibs'] === 'true'}
                                onChange={(e) => updateAttribute('application', 'android:extractNativeLibs', e.target.checked ? 'true' : 'false')}
                            />
                            <label htmlFor="extractNativeLibs" className="text-sm text-ide-text select-none">
                                Extract Native Libs
                            </label>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};
