import React, { useEffect, useState } from 'react';
import { Database, Table } from 'lucide-react';

interface SqliteEditorProps {
    path: string;
}

export const SqliteEditor: React.FC<SqliteEditorProps> = ({ path }) => {
    const [tables, setTables] = useState<string[]>([]);
    const [activeTable, setActiveTable] = useState<string | null>(null);
    const [tableData, setTableData] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchTables = async () => {
            try {
                const res = await window.electronAPI.executeCommand('sqlite.getTables', path);
                if (res.success) {
                    setTables(res.data);
                    if (res.data.length > 0) {
                        setActiveTable(res.data[0]);
                    }
                } else {
                    setError(res.error || 'Unknown error');
                }
            } catch (err: any) {
                setError(err.message);
            }
        };
        fetchTables();
    }, [path]);

    useEffect(() => {
        if (!activeTable) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await window.electronAPI.executeCommand('sqlite.query', {
                    dbPath: path,
                    sql: `SELECT * FROM ${activeTable} LIMIT 100` // Limit to prevent crashing UI
                });
                if (res.success) {
                    setTableData(res.data);
                    setError(null);
                } else {
                    setError(res.error || 'Unknown error');
                    setTableData([]);
                }
            } catch (err: any) {
                setError(err.message);
                setTableData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [activeTable, path]);

    return (
        <div className="h-full flex flex-col bg-ide-bg text-ide-text">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-ide-border bg-ide-surface">
                <Database size={16} className="text-purple-400" />
                <span className="font-semibold">{path.split(/[/\\]/).pop()}</span>
                {error && <span className="ml-4 text-xs text-red-400">{error}</span>}
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Tables Sidebar */}
                <div className="w-48 border-r border-ide-border bg-[#1e1e1e] overflow-y-auto">
                    <div className="px-3 py-2 text-xs font-semibold text-ide-text-muted uppercase tracking-wider">
                        Tables
                    </div>
                    {tables.map(table => (
                        <div 
                            key={table}
                            onClick={() => setActiveTable(table)}
                            className={`px-3 py-1.5 text-sm cursor-pointer flex items-center gap-2
                                ${activeTable === table ? 'bg-ide-accent text-white' : 'text-ide-text-muted hover:bg-ide-hover hover:text-white'}`}
                        >
                            <Table size={14} />
                            <span className="truncate">{table}</span>
                        </div>
                    ))}
                    {tables.length === 0 && !error && (
                        <div className="px-3 py-2 text-xs text-ide-text-muted italic">No tables found.</div>
                    )}
                </div>

                {/* Data View */}
                <div className="flex-1 overflow-auto p-4">
                    {loading ? (
                        <div className="text-ide-text-muted">Loading data...</div>
                    ) : tableData.length > 0 ? (
                        <div className="inline-block min-w-full rounded border border-ide-border overflow-hidden">
                            <table className="min-w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-[#252526] border-b border-ide-border text-ide-text-muted">
                                    <tr>
                                        {Object.keys(tableData[0]).map(col => (
                                            <th key={col} className="px-4 py-2 font-medium border-r border-ide-border last:border-0">{col}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableData.map((row, idx) => (
                                        <tr key={idx} className="border-b border-ide-border hover:bg-[#2a2d2e] transition-colors last:border-0">
                                            {Object.keys(row).map(col => (
                                                <td key={col} className="px-4 py-1.5 border-r border-ide-border last:border-0 max-w-xs truncate text-ide-text">
                                                    {row[col] !== null ? String(row[col]) : <span className="text-ide-text-muted italic">NULL</span>}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-ide-text-muted italic">No data in this table.</div>
                    )}
                </div>
            </div>
        </div>
    );
};
