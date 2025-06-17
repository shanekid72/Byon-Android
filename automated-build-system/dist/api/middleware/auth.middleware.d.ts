import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                partnerId: string;
                email: string;
                isAdmin: boolean;
            };
        }
    }
}
/**
 * Authentication middleware
 * Verifies JWT token and adds user information to request object
 */
export declare const authMiddleware: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
/**
 * Admin middleware
 * Ensures the authenticated user is an admin
 */
export declare const adminMiddleware: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=auth.middleware.d.ts.map