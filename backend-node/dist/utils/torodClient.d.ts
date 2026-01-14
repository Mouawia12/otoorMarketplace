import { type AxiosRequestConfig } from "axios";
type TorodApiResponse<T> = {
    data?: T;
    result?: T;
    message?: string;
    error?: string;
    errors?: unknown;
    success?: boolean;
} & Partial<T>;
export declare const torodRequest: <T>(request: AxiosRequestConfig, attempt?: number) => Promise<T>;
export type { TorodApiResponse };
//# sourceMappingURL=torodClient.d.ts.map