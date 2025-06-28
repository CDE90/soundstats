import { logger as baseLogger } from "./server";
import { useLogger as useBaseLogger } from "./client";

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerConfig {
    enableDebugLogs: boolean;
    enableClientLogs: boolean;
    samplingRate: number;
    component?: string;
}

const getLoggerConfig = (): LoggerConfig => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return {
        enableDebugLogs: isDevelopment,
        enableClientLogs: true,
        samplingRate: isDevelopment ? 1.0 : 0.05, // 100% in dev, 5% in prod
        component: undefined
    };
};

export const createLogger = (component: string) => {
    const config = getLoggerConfig();
    
    return {
        debug: (message: string, data?: object) => {
            if (config.enableDebugLogs) {
                baseLogger.debug(message, { component, ...data });
            }
        },
        info: (message: string, data?: object) => {
            baseLogger.info(message, { component, ...data });
        },
        warn: (message: string, data?: object) => {
            baseLogger.warn(message, { component, ...data });
        },
        error: (message: string, data?: object) => {
            baseLogger.error(message, { component, ...data });
        },
        // Sampled logging for high-frequency operations
        sample: (level: LogLevel, message: string, data?: object) => {
            if (Math.random() < config.samplingRate) {
                baseLogger[level](message, { component, sampled: true, ...data });
            }
        }
    };
};

export const createClientLogger = (component: string) => {
    const config = getLoggerConfig();
    
    return () => {
        const log = useBaseLogger();
        
        return {
            debug: (message: string, data?: object) => {
                if (config.enableDebugLogs) {
                    log.debug(message, { component, ...data });
                }
            },
            info: (message: string, data?: object) => {
                log.info(message, { component, ...data });
            },
            warn: (message: string, data?: object) => {
                log.warn(message, { component, ...data });
            },
            error: (message: string, data?: object) => {
                log.error(message, { component, ...data });
            },
            // Sampled logging for high-frequency operations
            sample: (level: LogLevel, message: string, data?: object) => {
                if (Math.random() < config.samplingRate) {
                    log[level](message, { component, sampled: true, ...data });
                }
            }
        };
    };
};

// Helper for conditional logging based on environment
export const logIf = (condition: boolean, level: LogLevel, message: string, data?: object) => {
    if (condition) {
        baseLogger[level](message, data);
    }
};

// Helper for development-only logging
export const devLog = (level: LogLevel, message: string, data?: object) => {
    logIf(process.env.NODE_ENV === 'development', level, message, data);
};

// Helper for production-only logging
export const prodLog = (level: LogLevel, message: string, data?: object) => {
    logIf(process.env.NODE_ENV === 'production', level, message, data);
};