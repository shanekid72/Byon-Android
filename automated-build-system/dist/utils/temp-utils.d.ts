export declare const logger: {
    info: (message?: any, ...optionalParams: any[]) => void;
    error: (message?: any, ...optionalParams: any[]) => void;
    warn: (message?: any, ...optionalParams: any[]) => void;
    debug: (message?: any, ...optionalParams: any[]) => void;
};
export declare const checkDatabaseConnection: () => Promise<boolean>;
export declare const connectDatabase: () => Promise<void>;
//# sourceMappingURL=temp-utils.d.ts.map