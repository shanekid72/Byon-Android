import WebSocket from 'ws';
export interface BuildUpdateMessage {
    type: 'build_progress' | 'build_completed' | 'build_failed' | 'build_started';
    buildId: string;
    status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
    progress?: number;
    currentStep?: string;
    estimatedTimeRemaining?: string;
    message?: string;
    artifacts?: any;
    error?: string;
    timestamp: string;
}
export interface ClientConnection {
    ws: WebSocket;
    buildId?: string;
    partnerId?: string;
    subscriptions: Set<string>;
    lastPing: Date;
}
export declare class BuildStatusService {
    private wss;
    private clients;
    private buildSubscriptions;
    private partnerSubscriptions;
    private pingInterval;
    constructor(wss: WebSocket.Server);
    private setupWebSocketHandlers;
    handleMessage(ws: WebSocket, message: WebSocket.Data): void;
    private subscribeToBuild;
    private subscribeToPartner;
    private unsubscribeFromBuild;
    private unsubscribeFromPartner;
    removeConnection(ws: WebSocket): void;
    private handleClientDisconnect;
    broadcastBuildUpdate(buildId: string, update: Partial<BuildUpdateMessage>): void;
    broadcastToPartner(partnerId: string, message: BuildUpdateMessage): void;
    broadcastSystemMessage(message: string): void;
    private sendToClient;
    private startPingInterval;
    getStats(): {
        connectedClients: number;
        buildSubscriptions: number;
        partnerSubscriptions: number;
        totalSubscriptions: number;
    };
    shutdown(): void;
}
//# sourceMappingURL=BuildStatusService.d.ts.map