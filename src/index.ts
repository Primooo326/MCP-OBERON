import express, { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { registerAllTools } from "./tools/register.js";
import { registerAllResources } from "./resources/register.js";
import cors from 'cors'
import { createAxiosInstance } from "./constants.js";
import * as path from 'path';
import * as fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
export interface AuthenticatedRequest extends Request {
    token?: string;
}

const app = express();
app.use(express.json());
app.use(cors({
    allowedHeaders: ['Content-Type', 'mcp-session-id', 'mcp-protocol-version', 'x-api-key'],
    exposedHeaders: ['Mcp-Session-Id'],
    origin: "*"
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};
const servers: { [sessionId: string]: McpServer } = {};
const PORT = 3001;


function createConfiguredMcpServer(token: string): McpServer {

    const systemPrompt = `
Eres Luna, la IA experta del ecosistema Oberon 360. Mi misión es traducir las preguntas de los usuarios en consultas de datos precisas, construyendo filtros avanzados y ejecutando un plan de acción confiable.

Enfoque Principal: Funcionalidades y Módulos Core
Mi dominio principal son las funcionalidades. Asumo que toda consulta sobre registros (activos, rondas, inspecciones, etc.) se refiere a una funcionalidad, a menos que el usuario especifique que es otro módulo distinto.

IMPORTANTE — Regla de Usuarios vs Funcionalidades:
- Si el usuario pide buscar, listar o consultar un USUARIO (por nombre, correo, email, username, etc.), debo usar DIRECTAMENTE la herramienta 'Obtener_Usuarios' pasando el término en 'terminoBusqueda'. Los usuarios son un módulo CORE separado (/core/users), NO son una funcionalidad. NUNCA debo usar 'Buscar_Funcionalidad_Por_Nombre' ni 'Buscar_Registros_De_Funcionalidad' para buscar usuarios.
- Las funcionalidades son exclusivamente para registros de módulos dinámicos como activos, rondas, inspecciones, etc.

Guía Fundamental de Filtros Avanzados (CRÍTICO — LEER SIEMPRE):
ANTES de construir cualquier filtro para 'Buscar_Registros_De_Funcionalidad', DEBO leer el recurso 'guia_filtros_avanzados_oberon' llamando a resources/read. Allí se explica el formato JSON correcto, los operadores permitidos (equals, contains, between...) y cómo filtrar por fechas o campos de relación.

Protocolo de Búsqueda de Registros:
1. Para buscar información específica sobre una funcionalidad, SIEMPRE usaré primero 'Buscar_Funcionalidad_Por_Nombre' para conocer su estructura y obtener el _id.
2. Luego, ANTES de construir el filtro, leeré el recurso 'guia_filtros_avanzados_oberon'.
3. Construiré el filtro usando los TÍTULOS de los campos como claves (ej: "FECHA ENTRADA", "USUARIO") y los operadores de la guía. La herramienta traduce los títulos a columnId internamente.
4. NUNCA envuelvo el filtro en {"filters": {"columns": [...]}}. Paso el objeto plano directamente.
5. Para rangos de fecha, usar el operador 'between' con el TÍTULO del campo de fecha como clave.
   Ejemplo correcto: { "FECHA ENTRADA": { "between": ["2026-01-17", "2026-07-17"] } }
6. Para campos de relación estática (ej. usuarios, despliegables fijos), usar 'equals' con el ID del registro relacionado.

Manejo de Cero Resultados:
Si una búsqueda devuelve 0 resultados, no me rindo inmediatamente. 
1. Realizo una llamada a 'Buscar_Registros_De_Funcionalidad' sin pasar filtros (solo enviando idFuncionalidad y cantidad: 5) para examinar una muestra de los datos reales.
2. Compruebo si cometí errores en los títulos de campos, mayúsculas o la estructura del filtro. Releo la guía si es necesario.
3. Si la búsqueda sigue vacía o es ambigua (ej. busco a "Juan" y hay múltiples "Juan", pregunto al usuario antes de proceder).

Regla para GPS/Temperatura de Vehículos:
Si el usuario consulta ubicación o temperatura, usaré directamente las herramientas 'Verificar_Estado_Temperatura_Placa' o 'Verificar_Estado_GPS_Placa' pasando la placa. 
- Si devuelven éxito = falso o datos no encontrados, indicaré claramente: "La placa [número] no se encuentra integrada o registrada en Oberon".
- Si devuelven datos reales, confirmaré que está registrado y agruparé sus lecturas correspondientes.

Exportación:
Opciones como exportToExcel (booleano) existen en las herramientas de obtención. Si el resultado es muy masivo (> 20 resultados) o el usuario lo pide implícitamente, generaré proactivamente la opción de un Excel activando esa flag, lo cual proveerá URLs descargables de los resultados.

Skills (Guías de Flujo de Trabajo):
Tengo a mi disposición recursos de tipo 'skill_*' que contienen guías paso a paso para tareas comunes. DEBO leer el skill correspondiente a través de list/read_resources cuando el usuario solicite una tarea que tenga un skill asociado.
- Si el usuario pide crear un usuario, DEBO leer 'skill_crear_usuario' y seguir sus pasos.
`;

    const server = new McpServer(
        {
            name: "oberon-stremable-http",
            version: "1.2.0",
        },
        {
            instructions: systemPrompt,
            capabilities: {
                prompts: {},
                resources: {},
                tools: {}
            }
        }
    );

    const apikey = token || process.env.API_KEY || "";

    registerAllTools(server, apikey);
    registerAllResources(server);

    return server;
}

async function checkToken(token: string): Promise<boolean> {

    try {
        const axiosInstance = createAxiosInstance(token);

        const resp = await axiosInstance.get('/core/auth/locationsForUser');

        if (resp.data.statusCode === 200) {
            return true;
        } else {
            return false;
        }

    } catch (error) {
        console.log(error);
        return false;
    }

}

app.use('/mcp', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.headers['x-api-key'] as string;

    if (!token) {
        res.status(401).json({ error: "Missing x-api-key header" });
        return;
    }

    if (!req.headers['mcp-session-id'] && req.method === 'POST' && isInitializeRequest(req.body)) {
        const tokenValid = await checkToken(token);
        if (!tokenValid) {
            res.status(401).json({ error: "Token inválido." });
            return;
        }
    }

    (req as AuthenticatedRequest).token = token;
    next();
});

app.post('/mcp', async (req: express.Request, res: express.Response) => {
    try {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        let transport: StreamableHTTPServerTransport;

        if (sessionId && transports[sessionId]) {
            transport = transports[sessionId];
        } else if (!sessionId && isInitializeRequest(req.body)) {
            console.log("Recibida nueva solicitud de inicialización. Creando sesión...");

            const server = createConfiguredMcpServer((req as AuthenticatedRequest).token!);

            transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: () => randomUUID(),
                onsessioninitialized: (newSessionId) => {
                    transports[newSessionId] = transport;
                    servers[newSessionId] = server;
                    console.log(`[Sesión ${newSessionId}] Creada y almacenada.`);
                }
            });

            transport.onclose = () => {
                if (transport.sessionId) {
                    console.log(`[Sesión ${transport.sessionId}] Cerrada. Eliminando transporte.`);
                    const srv = servers[transport.sessionId];
                    if (srv) {
                        delete servers[transport.sessionId];
                        srv.close();
                    }
                    delete transports[transport.sessionId];
                }
            };

            await server.connect(transport);
        } else {
            res.status(400).json({
                jsonrpc: '2.0',
                error: {
                    code: -32000,
                    message: 'Petición incorrecta: No se proporcionó un ID de sesión válido o la petición no es de inicialización.',
                },
                id: null,
            });
            return;
        }

        await transport.handleRequest(req, res, req.body);
    } catch (error) {
        console.error('Error handling MCP POST request:', error);
        if (!res.headersSent) {
            res.status(500).json({
                jsonrpc: '2.0',
                error: { code: -32603, message: 'Internal server error' },
                id: null
            });
        }
    }
});

const handleGetSessionRequest = async (req: express.Request, res: express.Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
        res.status(400).send('ID de sesión inválido o faltante');
        return;
    }

    const lastEventId = req.headers['last-event-id'];
    if (lastEventId) {
        console.log(`Cliente reconectando con Last-Event-ID: ${lastEventId} para la sesión ${sessionId}`);
    } else {
        console.log(`Estableciendo nuevo stream para la sesión ${sessionId}`);
    }

    try {
        const transport = transports[sessionId];
        await transport.handleRequest(req, res);
    } catch (error) {
        console.error('Error handling GET session request:', error);
        if (!res.headersSent) {
            res.status(500).send('Error interno del servidor al procesar la conexión de stream');
        }
    }
};

const handleDeleteSessionRequest = async (req: express.Request, res: express.Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
        res.status(400).send('ID de sesión inválido o faltante');
        return;
    }
    console.log(`Recibida solicitud de terminación de sesión para la sesión ${sessionId}`);
    try {
        const transport = transports[sessionId];
        await transport.handleRequest(req, res);
    } catch (error) {
        console.error('Error handling session termination:', error);
        if (!res.headersSent) {
            res.status(500).send('Error procesando la terminación de la sesión');
        }
    }
}

app.get('/mcp', handleGetSessionRequest);
app.delete('/mcp', handleDeleteSessionRequest);

async function cleanupDownloads() {
    const downloadsDir = path.join(__dirname, 'downloads');
    if (!existsSync(downloadsDir)) {
        return;
    }
    try {
        const files = await fs.readdir(downloadsDir);
        const now = Date.now();
        const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 días
        
        for (const file of files) {
            const filePath = path.join(downloadsDir, file);
            const stats = await fs.stat(filePath);
            if (now - stats.mtimeMs > MAX_AGE) {
                await fs.unlink(filePath);
                console.log(`[Limpieza] Archivo viejo eliminado: ${file}`);
            }
        }
    } catch (error) {
        console.error('[Limpieza] Error al limpiar descargas:', error);
    }
}

const httpServer = app.listen(PORT, () => {
    console.log(`Servidor MCP de Oberon (Streamable HTTP) iniciado y escuchando en http://localhost:${PORT}/mcp`);
    cleanupDownloads();
    setInterval(cleanupDownloads, 24 * 60 * 60 * 1000);
});

process.on('SIGINT', async () => {
    console.log('Apagando el servidor MCP...');
    httpServer.close();

    for (const sessionId in transports) {
        try {
            console.log(`Cerrando transporte de la sesión ${sessionId}`);
            const transport = transports[sessionId];
            const server = servers[sessionId];

            delete transports[sessionId];
            delete servers[sessionId];

            transport.onclose = undefined;

            await transport.close();
            if (server) await server.close();
        } catch (error) {
            console.error(`Error al cerrar la sesión ${sessionId}:`, error);
        }
    }

    console.log('Apagado del servidor completado');
    process.exit(0);
});
