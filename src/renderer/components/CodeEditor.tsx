import React from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
    path: string;
    content: string;
    onChange: (newContent: string) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ path, content, onChange }) => {
    
    // Determine language based on file extension
    const getLanguage = (fileName: string) => {
        if (fileName.endsWith('.json')) return 'json';
        if (fileName.endsWith('.xml')) return 'xml';
        if (fileName.endsWith('.java')) return 'java';
        if (fileName.endsWith('.kt')) return 'kotlin';
        if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) return 'typescript';
        if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) return 'javascript';
        if (fileName.endsWith('.smali')) return 'smali'; // Monaco might fallback to plaintext but we can register it later
        if (fileName.endsWith('.yaml') || fileName.endsWith('.yml')) return 'yaml';
        return 'plaintext';
    };

    const handleEditorChange = (value: string | undefined) => {
        if (value !== undefined) {
            onChange(value);
        }
    };

    return (
        <Editor
            height="100%"
            path={path}
            language={getLanguage(path)}
            value={content}
            theme="vs-dark" // Android Studio Darcula feel
            onChange={handleEditorChange}
            options={{
                selectOnLineNumbers: true,
                roundedSelection: false,
                readOnly: false,
                cursorStyle: 'line',
                automaticLayout: true,
                minimap: { enabled: true },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                formatOnPaste: true,
            }}
            loading={
                <div className="flex h-full items-center justify-center text-ide-text-muted">
                    Loading editor...
                </div>
            }
        />
    );
};
