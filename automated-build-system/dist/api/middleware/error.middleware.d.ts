import { Request, Response, NextFunction } from 'express';
interface AppError extends Error {
    statusCode?: number;
    status?: string;
    isOperational?: boolean;
}
export declare const errorHandler: (err: AppError, req: Request, res: Response, next: NextFunction) => void;
export declare const notFound: (req: Request, res: Response, next: NextFunction) => void;
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => Promise<any>;
export {};
//# sourceMappingURL=error.middleware.d.ts.map