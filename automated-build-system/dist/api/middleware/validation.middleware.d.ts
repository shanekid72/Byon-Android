import { Request, Response, NextFunction } from 'express';
/**
 * Validation middleware for build-related requests
 */
export declare class BuildValidator {
    /**
     * Validate create build request
     */
    static validateCreateBuild(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
    /**
     * Validate build ID parameter
     */
    static validateBuildId(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
}
//# sourceMappingURL=validation.middleware.d.ts.map