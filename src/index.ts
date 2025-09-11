import express, { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { registerAllTools } from "./tools/register.js";
import dotenv from "dotenv";
import { registerAllResources } from "./resources/register.js";

dotenv.config();

interface AuthenticatedRequest extends Request {
    token?: string;
}

const app = express();
app.use(express.json());


const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};
const PORT = 3001;


// Importa McpServer y tus registros como ya lo haces
function createConfiguredMcpServer(token: string): McpServer {
    // Definimos el System Prompt en una constante para mayor claridad
    const systemPrompt = `Eres OberonAI, un asistente experto en el ecosistema de seguridad Oberon 360 de la empresa TSI. Tu propósito es ayudar a los usuarios a consultar información utilizando un conjunto de herramientas especializadas.

Tus herramientas principales son:
- \`Buscar Funcionalidades\`: Para búsquedas avanzadas de definiciones.
- \`buscarFuncionalidadPorNombre\`: Para encontrar una funcionalidad específica por su nombre.
- \`buscarRegistrosDeFuncionalidad\`: Para obtener los registros de datos de una funcionalidad usando su ID.

Tus herramientas secundarias son:
- \`Buscar Clientes\`: Para obtener información sobre los clientes de la empresa.
- \`Buscar Usuarios\`: Para obtener información sobre los usuarios de la empresa.
- \`Buscar Roles\`: Para obtener información sobre los roles de la empresa.

**REGLA GENERAL: USO DE FILTROS AVANZADOS**
Para ejecutar búsquedas precisas, debes apoyarte en el filtro avanzado. Muchas de tus herramientas aceptan un parámetro \`filtro\`. En lugar de hacer búsquedas simples, analiza la petición del usuario y construye un filtro JSON. **Recuerda que tienes a tu disposición el recurso llamado 'guia_filtros_avanzados_oberon' donde puedes consultar el esquema completo, los operadores y ejemplos para construir correctamente el filtro.**

Por ejemplo, si un usuario pide "activos en bodega que cuesten más de 500", debes construir un filtro complejo como:
\`\`\`json
{
  "$and": [
    { "Ubicación": { "value": { "equals": "ID_DE_LA_BODEGA" } } },
    { "Costo": { "value": { "gt": 500 } } }
  ]
}
\`\`\`

**REGLA CRÍTICA: PLAN DE EJECUCIÓN PARA BUSCAR REGISTROS**
Cuando un usuario te pida buscar registros de una funcionalidad por su nombre (ej: "búscame los activos" o "quiero los registros de rondas"), **SIEMPRE** debes seguir este plan de dos pasos:

1.  **Paso 1: OBTENER EL ID.** Usa la herramienta \`buscarFuncionalidadPorNombre\` para encontrar la definición de la funcionalidad que el usuario mencionó. De su respuesta, obtendrás el \`idFuncionalidad\`.
2.  **Paso 2: BUSCAR LOS REGISTROS.** Usa el \`idFuncionalidad\` que obtuviste en el paso anterior para llamar a la herramienta \`buscarRegistrosDeFuncionalidad\`.

Nunca intentes adivinar un ID. Si no estás seguro, pregunta al usuario para aclarar.`;

    const server = new McpServer({
        name: "oberon-stremable-http",
        version: "1.1.0",
        capabilities: {
            system: systemPrompt,
            resources: {}, // Se llenará con registerAllResources
            tools: {}      // Se llenará con registerAllTools
        }
    });

    const apikey = process.env.API_KEY || token;

    registerAllTools(server, apikey);
    registerAllResources(server);

    console.log("[Servidor MCP] Todas las herramientas y recursos han sido registrados para la nueva sesión.");

    return server;
}

// function createConfiguredMcpServer(token: string): McpServer {
//     const server = new McpServer({
//         name: "oberon-stremable-http",
//         version: "1.1.0",
//         capabilities: {
//             resources: {},
//             tools: {},
//         }
//     });

//     const apikey = process.env.API_KEY || token;

//     registerAllTools(server, apikey);
//     registerAllResources(server);

//     console.log("[Servidor MCP] Todas las herramientas han sido registradas para la nueva sesión.");

//     return server;
// }

app.post('/mcp', async (req: AuthenticatedRequest, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
        transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
        console.log("Recibida nueva solicitud de inicialización. Creando sesión...");

        transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (newSessionId) => {
                transports[newSessionId] = transport;
                console.log(`[Sesión ${newSessionId}] Creada y almacenada.`);
            },
        });

        transport.onclose = () => {
            if (transport.sessionId) {
                console.log(`[Sesión ${transport.sessionId}] Cerrada. Eliminando transporte.`);
                delete transports[transport.sessionId];
            }
        };

        const server = createConfiguredMcpServer(req.headers['x-api-key'] as string);

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
});

const handleSessionRequest = async (req: express.Request, res: express.Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
        res.status(400).send('ID de sesión inválido o faltante');
        return;
    }

    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
};

app.get('/mcp', handleSessionRequest);
app.delete('/mcp', handleSessionRequest);


app.listen(PORT, () => {
    console.log(`Servidor MCP de Oberon (Streamable HTTP) iniciado y escuchando en http://localhost:${PORT}`);
    console.log('Ruta de login disponible en POST http://localhost:3000/login');
});


