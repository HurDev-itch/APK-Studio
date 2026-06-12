export interface PluginManifest {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    main?: string; // Entry point for Node.js Worker thread (Background Plugin)
    ui?: string;   // Entry point for UI iframe (UI Plugin)
    permissions: PluginPermission[];
}

export type PluginPermission = 'workspace' | 'filesystem' | 'network' | 'ai' | 'commands';

export interface PluginSDK {
    commands: {
        register(commandId: string, callback: (...args: any[]) => void): void;
        execute(commandId: string, ...args: any[]): Promise<any>;
    };
    events: {
        on(event: string, callback: (...args: any[]) => void): void;
        emit(event: string, ...args: any[]): void;
    };
    workspace: {
        getActiveFilePath(): Promise<string | null>;
        readFile(path: string): Promise<string>;
    };
    ai: {
        chat(prompt: string): Promise<string>;
    };
    notifications: {
        show(message: string, type?: 'info' | 'error' | 'warning'): void;
    };
}
