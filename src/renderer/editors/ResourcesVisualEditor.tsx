import React, { useEffect, useState } from 'react';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

interface ResourcesVisualEditorProps {
    content: string;
    onChange: (newContent: string) => void;
}

export const ResourcesVisualEditor: React.FC<ResourcesVisualEditorProps> = ({ content, onChange }) => {
    const [resData, setResData] = useState<any>(null);
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
            setResData(parsed);
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
                <div className="text-lg font-semibold mb-2">Invalid Resource XML</div>
                <div className="text-sm opacity-80">{error}</div>
            </div>
        );
    }

    if (!resData) {
        return <div className="p-8 text-ide-text-muted">Loading Resources...</div>;
    }

    const resourcesNode = findNode(resData, 'resources');
    if (!resourcesNode || !resourcesNode.resources) {
        return <div className="p-8 text-ide-text-muted">No &lt;resources&gt; tag found.</div>;
    }

    const items = resourcesNode.resources.filter((n: any) => {
        const key = Object.keys(n)[0];
        return key === 'string' || key === 'color' || key === 'dimen' || key === 'integer' || key === 'bool';
    });

    const updateItemValue = (index: number, newValue: string) => {
        const newData = JSON.parse(JSON.stringify(resData));
        const resList = findNode(newData, 'resources').resources;
        
        let itemCounter = 0;
        for (let i = 0; i < resList.length; i++) {
            const key = Object.keys(resList[i])[0];
            if (['string', 'color', 'dimen', 'integer', 'bool'].includes(key)) {
                if (itemCounter === index) {
                    resList[i][key] = [{ '#text': newValue }];
                    break;
                }
                itemCounter++;
            }
        }
        
        setResData(newData);
        handleSave(newData);
    };

    return (
        <div className="h-full bg-ide-bg text-ide-text overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h2 className="text-2xl font-light text-white mb-1">Resources Editor</h2>
                    <p className="text-sm text-ide-text-muted">Edit strings, colors, and other XML resources.</p>
                </div>

                <div className="bg-[#1e1e1e] border border-ide-border rounded overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#252526] border-b border-ide-border text-ide-text-muted">
                            <tr>
                                <th className="px-4 py-2 font-medium w-32">Type</th>
                                <th className="px-4 py-2 font-medium w-64">Name</th>
                                <th className="px-4 py-2 font-medium">Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-8 text-center text-ide-text-muted italic">
                                        No values found in this resource file.
                                    </td>
                                </tr>
                            )}
                            {items.map((item: any, index: number) => {
                                const type = Object.keys(item)[0];
                                const attrs = item[':@'] || {};
                                const name = attrs['@_name'] || '(unnamed)';
                                const valueObj = item[type]?.[0];
                                const value = valueObj ? (valueObj['#text'] || '') : '';

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
                                            <input 
                                                type="text" 
                                                className="w-full bg-transparent border-b border-transparent focus:border-ide-accent outline-none text-white transition-colors"
                                                value={value}
                                                onChange={(e) => updateItemValue(index, e.target.value)}
                                            />
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
