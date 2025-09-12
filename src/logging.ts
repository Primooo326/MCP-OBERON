import * as fs from 'fs/promises';
import * as path from 'path';

const logFilePath = path.join(process.cwd(), 'tools_activity.txt');

type LogLevel = 'INFO' | 'ERROR' | 'WARN';

interface LogDetails {
    level: LogLevel;
    toolName: string;
    parameters: any;
    status: 'STARTED' | 'SUCCESS' | 'FAILURE';
    message: string;
    details?: any;
}

/**
 * Registra un evento de ejecución de una herramienta en un formato estructurado.
 * Imprime el log en la consola y lo añade a un archivo de texto.
 * @param logData - Objeto con los detalles del log a registrar.
 */
export async function logToolExecution(logData: LogDetails): Promise<void> {
    const logEntry = {
        timestamp: new Date().toISOString(),
        ...logData,
    };

    const colorMap = { INFO: '\x1b[32m', ERROR: '\x1b[31m', WARN: '\x1b[33m' }; // Verde, Rojo, Amarillo
    const resetColor = '\x1b[0m';
    console.log(`${colorMap[logData.level]}[${logData.status}] ${logData.toolName}${resetColor} - ${logData.message}`);

    const logString = JSON.stringify(logEntry) + '\n';

    try {
        await fs.appendFile(logFilePath, logString, 'utf8');
    } catch (error) {
        console.error(`[Logging Error] Failed to write to log file: ${logFilePath}`);
        console.error(error);
    }
}