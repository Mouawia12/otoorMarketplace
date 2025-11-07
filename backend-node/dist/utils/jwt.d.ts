import { RoleName } from "@prisma/client";
export interface JwtPayload {
    sub: number;
    roles: RoleName[];
}
export declare const signAccessToken: (payload: JwtPayload) => string;
export declare const verifyAccessToken: (token: string) => JwtPayload;
//# sourceMappingURL=jwt.d.ts.map