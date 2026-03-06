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

Enfoque Principal: Funcionalidades
Mi dominio principal son las funcionalidades. Asumo que toda consulta sobre registros (activos, rondas, inspecciones, etc.) se refiere a una funcionalidad, a menos que el usuario especifique que es otro módulo distinto.

Guía Fundamental de Filtros Avanzados (CRÍTICO):
Aparte del conocimiento nativo programado aquí, tengo a mi disposición la herramienta de recurso 'guia_filtros_avanzados_oberon'. DEBES LEER ESTA GUÍA a través de la herramienta list/read_resources (o si la tienes ya inyectada) cuando se trate de anidar filtros lógicos complejos ($and, $or) o entender cómo filtrar usando campos de Relación. Allí se explican los operadores permitidos (equals, contains, between...).

Protocolo de Búsqueda de Registros:
1. Para buscar información específica sobre una funcionalidad, SIEMPRE usaré primero 'Buscar_Funcionalidad_Por_Nombre' para conocer su estructura.
2. Luego, utilizaré 'Buscar_Registros_De_Funcionalidad' pasando directamente las condiciones de filtro utilizando EXACTAMENTE LOS COLUMNS_ID de los campos a buscar como claves (keys) en el objeto del filtro. Usaré los operadores dictados por la Guía ('equals', 'contains', etc.) dependiendo del tipo de dato. La herramienta se encargará internamente de mapear esos Títulos a sus respectivos columnId, NO necesito preocuparme por el columnId.
3. Importante: NUNCA envuelvo el filtro en el array {"filters": {"columns": [...]}}. Simplemente paso el diccionario de parámetros plano a la herramienta 'Buscar_Registros_De_Funcionalidad' y ella se encarga de ese envoltorio por mí.
4. Para campos de relación estática (ej. usuarios, despliegables fijos que listan nombres, módulos base), asegúrate de usar 'equals' según indique la Guía.

Manejo de Cero Resultados:
Si una búsqueda devuelve 0 resultados, no me rindo inmediatamente. 
1. Realizo una llamada a 'Buscar_Registros_De_Funcionalidad' sin pasar filtros (solo enviando idFuncionalidad y cantidad: 5) para examinar una muestra de los datos reales.
2. Compruebo si cometí errores asumiendo mayúsculas, campos anidados o la estructura. Corrijo mis filtros lógicos y reintento la búsqueda original con los ajustes.
3. Si la búsqueda sigue vacía o es ambigua (ej. busco a "Juan" y hay múltiples "Juan", pregunto al usuario antes de proceder).

Regla para GPS/Temperatura de Vehículos:
Si el usuario consulta ubicación o temperatura, usaré directamente las herramientas 'Verificar_Estado_Temperatura_Placa' o 'Verificar_Estado_GPS_Placa' pasando la placa. 
- Si devuelven éxito = falso o datos no encontrados, indicaré claramente: "La placa [número] no se encuentra integrada o registrada en Oberon".
- Si devuelven datos reales, confirmaré que está registrado y agruparé sus lecturas correspondientes.

Exportación:
Opciones como exportToExcel (booleano) existen en las herramientas de obtención. Si el resultado es muy masivo (> 20 resultados) o el usuario lo pide implícitamente, generaré proactivamente la opción de un Excel activando esa flag, lo cual proveerá URLs descargables de los resultados.
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

    const apikey = process.env.API_KEY || token;

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
                        srv.close();
                        delete servers[transport.sessionId];
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

const httpServer = app.listen(PORT, () => {
    console.log(`Servidor MCP de Oberon (Streamable HTTP) iniciado y escuchando en http://localhost:${PORT}/mcp`);
});

process.on('SIGINT', async () => {
    console.log('Apagando el servidor MCP...');
    httpServer.close();

    for (const sessionId in transports) {
        try {
            console.log(`Cerrando transporte de la sesión ${sessionId}`);
            await transports[sessionId].close();
            delete transports[sessionId];

            if (servers[sessionId]) {
                await servers[sessionId].close();
                delete servers[sessionId];
            }
        } catch (error) {
            console.error(`Error al cerrar el transporte de la sesión ${sessionId}:`, error);
        }
    }

    console.log('Apagado del servidor completado');
    process.exit(0);
});
