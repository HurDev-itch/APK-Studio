// Shared types for Event and Command Buses

export interface IEvent {
    type: string;
    payload?: any;
    source?: 'main' | 'renderer' | 'worker';
}

export interface ICommandRequest {
    commandId: string;
    args?: any;
}

export interface ICommandResponse {
    success: boolean;
    data?: any;
    error?: string;
}

export type EventHandler = (event: IEvent) => void;
export type CommandHandler = (args: any) => Promise<any> | any;
