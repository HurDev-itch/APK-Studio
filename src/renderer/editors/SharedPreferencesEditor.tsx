import React, { useEffect, useState } from 'react';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

interface SharedPreferencesEditorProps {
    content: string;
    onChange: (newContent: string) => void;
}

export const SharedPreferencesEditor: React.FC<SharedPreferencesEditorProps> = ({ content, onChange }) => {
    const [prefsData, setPrefsData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const parserOptions = {
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
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
            setPrefsData(parsed);
            setError(null);
        } catch (err: any) {
            setError(`Failed to parse XML: ${err.message}`);
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

    const findNode = (nodes: any[], tagName: string) => {
        if (!nodes) return null;
        return nodes.find(n => Object.keys(n)[0] === tagName);
    };

    if (error) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-red-400 p-8 text-center">
                <div className="text-lg font-semibold mb-2">Invalid SharedPreferences XML</div>
                <div className="text-sm opacity-80">{error}</div>
            </div>
        );
    }

    if (!prefsData) {
        return <div className="p-8 text-ide-text-muted">Loading Preferences...</div>;
    }

    const mapNode = findNode(prefsData, 'map');
    if (!mapNode || !mapNode.map) {
        return <div className="p-8 text-ide-text-muted">No &lt;map&gt; tag found.</div>;
    }

    const items = mapNode.map;

    const updateItemValue = (index: number, type: string, newValue: string | boolean) => {
        const newData = JSON.parse(JSON.stringify(prefsData));
        const mapList = findNode(newData, 'map').map;
        
        const item = mapList[index];
        if (type === 'boolean') {
            if (!item[':@']) item[':@'] = {};
            item[':@']['@_value'] = newValue ? 'true' : 'false';
        } else if (type === 'string') {
            item[type] = [{ '#text': newValue as string }];
        } else if (type === 'int' || type === 'float' || type === 'long') {
            if (!item[':@']) item[':@'] = {};
            item[':@']['@_value'] = String(newValue);
        }
        
        setPrefsData(newData);
        handleSave(newData);
    };

    return (
        <div className="h-full bg-ide-bg text-ide-text overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h2 className="text-2xl font-light text-white mb-1">SharedPreferences</h2>
                    <p className="text-sm text-ide-text-muted">Edit preferences map stored in XML.</p>
                </div>

                <div className="bg-[#1e1e1e] border border-ide-border rounded overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#252526] border-b border-ide-border text-ide-text-muted">
                            <tr>
                                <th className="px-4 py-2 font-medium w-32">Type</th>
                                <th className="px-4 py-2 font-medium w-64">Key</th>
                                <th className="px-4 py-2 font-medium">Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-ide-text-muted italic">
                                        No preferences found.
                                    </td>
                                </tr>
                            )}
                            {items.map((item: any, index: number) => {
                                const type = Object.keys(item)[0];
                                if (type === ':@') return null;
                                
                                const attrs = item[':@'] || {};
                                const name = attrs['@_name'] || '(unnamed)';
                                
                                let value: any = '';
                                if (type === 'string') {
                                    const valueObj = item[type]?.[0];
                                    value = valueObj ? (valueObj['#text'] || '') : '';
                                } else {
                                    value = attrs['@_value'] || '';
                                }

                                return (
                                    <tr key={index} className="border-b border-ide-border hover:bg-[#2a2d2e] transition-colors">
                                        <td className="px-4 py-2">
                                            <span className="bg-[#3e3e42] text-white px-2 py-0.5 rounded text-[11px] uppercase tracking-wider">
                                                {type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 font-mono text-ide-accent">
                                            {name}
                                        </td>
                                        <td className="px-4 py-2">
                                            {type === 'boolean' ? (
                                                <select 
                                                    className="w-full bg-transparent border-b border-transparent focus:border-ide-accent outline-none text-white transition-colors cursor-pointer"
                                                    value={value}
                                                    onChange={(e) => updateItemValue(index, type, e.target.value === 'true')}
                                                >
                                                    <option value="true" className="bg-[#1e1e1e]">true</option>
                                                    <option value="false" className="bg-[#1e1e1e]">false</option>
                                                </select>
                                            ) : (
                                                <input 
                                                    type="text" 
                                                    className="w-full bg-transparent border-b border-transparent focus:border-ide-accent outline-none text-white transition-colors"
                                                    value={value}
                                                    onChange={(e) => updateItemValue(index, type, e.target.value)}
                                                />
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
