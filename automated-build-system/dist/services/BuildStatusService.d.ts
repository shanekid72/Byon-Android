import WebSocket from 'ws';
export declare class BuildStatusService {
    private wss;
    private connections;
    constructor(wss: WebSocket.Server);
    addConnection(buildId: string, ws: WebSocket): void;
    removeConnection(ws: WebSocket): void;
    broadcastUpdate(buildId: string, update: any): void;
    handleMessage(ws: WebSocket, data: any): void;
}
//# sourceMappingURL=BuildStatusService.d.ts.map