export interface RequestOptions {
    authenticated?: boolean;
    allowRetry?: boolean;
    headers?: Record<string, string>;
}
export declare class ApiError extends Error {
    statusCode: number;
    responseBody?: any | undefined;
    constructor(statusCode: number, message: string, responseBody?: any | undefined);
}
export declare function requestRaw(baseUrl: string, path: string, method?: string, body?: any, options?: RequestOptions): Promise<any>;
export declare const api: {
    get: (path: string, options?: RequestOptions) => Promise<any>;
    post: (path: string, body?: any, options?: RequestOptions) => Promise<any>;
    put: (path: string, body?: any, options?: RequestOptions) => Promise<any>;
    delete: (path: string, options?: RequestOptions) => Promise<any>;
    authPost: (path: string, body?: any, options?: RequestOptions) => Promise<any>;
};
