export declare class LuluPayServer {
    private app;
    private server?;
    private wss;
    private buildStatusService;
    constructor();
    private setupMiddleware;
    private setupRoutes;
    private setupErrorHandling;
    private setupWebSocket;
    start(): Promise<void>;
    private setupGracefulShutdown;
}
export default LuluPayServer;
//# sourceMappingURL=index.d.ts.map