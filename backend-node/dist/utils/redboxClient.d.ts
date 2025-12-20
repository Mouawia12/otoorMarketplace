import { type AxiosRequestConfig } from "axios";
type RedboxApiResponse<T> = {
    success?: boolean;
    response_code?: number;
    msg?: string;
    message?: string;
    data?: T;
    result?: T;
} & Partial<T>;
export declare const redboxRequest: <T>(request: AxiosRequestConfig, attempt?: number) => Promise<T>;
export type { RedboxApiResponse };
//# sourceMappingURL=redboxClient.d.ts.map