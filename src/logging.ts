import * as fs from 'fs/promises';
import * as path from 'path';

// --- CÓDIGO ACTUALIZADO PARA LOGGING ---

// Define la ruta del archivo de log. Se creará en el directorio raíz de tu proyecto.
const logFilePath = path.join(process.cwd(), 'tools_activity.txt');

// Definimos los niveles de log para estandarizar
type LogLevel = 'INFO' | 'ERROR' | 'WARN';

interface LogDetails {
    level: LogLevel;
    toolName: string;
    parameters: any;
    status: 'STARTED' | 'SUCCESS' | 'FAILURE';
    message: string;
    details?: any; // Para información extra, como stack traces de errores
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

    // 1. Formatear el log para la consola (con colores para legibilidad)
    const colorMap = { INFO: '\x1b[32m', ERROR: '\x1b[31m', WARN: '\x1b[33m' }; // Verde, Rojo, Amarillo
    const resetColor = '\x1b[0m';
    console.log(`${colorMap[logData.level]}[${logData.status}] ${logData.toolName}${resetColor} - ${logData.message}`);

    // 2. Formatear el log para el archivo (JSON en una línea)
    const logString = JSON.stringify(logEntry) + '\n';

    // 3. Añadir el log al archivo de texto
    try {
        await fs.appendFile(logFilePath, logString, 'utf8');
    } catch (error) {
        // Si falla la escritura del archivo, mostrar el error en la consola para no perder la traza.
        console.error(`[Logging Error] Failed to write to log file: ${logFilePath}`);
        console.error(error);
    }
}