import React, { useRef } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { useWorkspaceStore } from '../store/workspaceStore';

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

    const monaco = useMonaco();
    const editorRef = useRef<any>(null);
    const { setProblems, clearProblems } = useWorkspaceStore();

    const handleEditorChange = (value: string | undefined) => {
        if (value !== undefined) {
            onChange(value);
            if (getLanguage(path) === 'xml') {
                validateXml(value);
            }
        }
    };

    const validateXml = (xmlStr: string) => {
        if (!monaco || !editorRef.current) return;
        const model = editorRef.current.getModel();
        if (!model) return;

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(xmlStr, "text/xml");
            const parseError = doc.getElementsByTagName("parsererror");
            
            const markers: any[] = [];
            
            if (parseError.length > 0) {
                // Extract error message
                const errorText = parseError[0].textContent || "XML Parsing Error";
                // Approximate line number extraction (basic)
                const lineMatch = errorText.match(/line number (\d+)/i);
                const colMatch = errorText.match(/column (\d+)/i);
                
                const line = lineMatch ? parseInt(lineMatch[1]) : 1;
                const col = colMatch ? parseInt(colMatch[1]) : 1;

                markers.push({
                    severity: monaco.MarkerSeverity.Error,
                    message: errorText.split('\n')[0] || "Invalid XML syntax",
                    startLineNumber: line,
                    startColumn: Math.max(1, col - 5),
                    endLineNumber: line,
                    endColumn: col + 5,
                });
            }
            
            monaco.editor.setModelMarkers(model, 'xml-validator', markers);
            
            // Sync to global problems store
            if (markers.length > 0) {
                setProblems('XML Validator', path, markers.map(m => ({
                    message: m.message,
                    severity: 'error',
                    line: m.startLineNumber,
                    col: m.startColumn
                })));
            } else {
                clearProblems('XML Validator', path);
            }
        } catch (e) {
            // Ignore if dom parser fails entirely
        }
    };

    const handleEditorDidMount = (editor: any) => {
        editorRef.current = editor;
        if (getLanguage(path) === 'xml') {
            validateXml(content);
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
            onMount={handleEditorDidMount}
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
