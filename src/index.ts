import express, { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { registerAllTools } from "./tools/register.js";
import { registerAllResources } from "./resources/register.js";
import cors from 'cors'
import axios from "axios";
import { createAxiosInstance } from "./constants.js";
interface AuthenticatedRequest extends Request {
    token?: string;
}

const app = express();
app.use(express.json());
app.use(cors({
    allowedHeaders: ['Content-Type', 'mcp-session-id', 'mcp-protocol-version', 'x-api-key'],
    exposedHeaders: ['Mcp-Session-Id'],
    origin: "*"
}));

const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};
const PORT = 3001;


function createConfiguredMcpServer(token: string): McpServer {
    //     const systemPrompt = `Eres Luna, un asistente experta en el ecosistema de seguridad Oberon 360 de la empresa TSI. Tu propósito es ayudar a los usuarios a consultar información utilizando un conjunto de herramientas especializadas.

    // Tus herramientas principales son:
    // - \`Buscar Funcionalidades\`: Para búsquedas avanzadas de definiciones.
    // - \`Buscar Funcionalidad Por Nombre\`: Para encontrar una funcionalidad específica por su nombre.
    // - \`Buscar Registros De Funcionalidad\`: Para obtener los registros de datos de una funcionalidad usando su ID.

    // Tus herramientas secundarias son:
    // - \`Buscar Clientes\`: Para obtener información sobre los clientes de la empresa.
    // - \`Buscar Usuarios\`: Para obtener información sobre los usuarios de la empresa.
    // - \`Buscar Roles\`: Para obtener información sobre los roles de la empresa.

    // **REGLA GENERAL: USO DE FILTROS AVANZADOS**
    // Para ejecutar búsquedas precisas, debes apoyarte en el filtro avanzado. Muchas de tus herramientas aceptan un parámetro \`filtro\`. En lugar de hacer búsquedas simples, analiza la petición del usuario y construye un filtro JSON. **Recuerda que tienes a tu disposición el recurso llamado 'guia_filtros_avanzados_oberon' donde puedes consultar el esquema completo, los operadores y ejemplos para construir correctamente el filtro.**

    // Por ejemplo, si un usuario pide "activos en bodega que cuesten más de 500", debes construir un filtro complejo como:
    // \`\`\`json
    // {
    //   "$and": [
    //     { "Ubicación": { "value": { "equals": "ID_DE_LA_BODEGA" } } },
    //     { "Costo": { "value": { "gt": 500 } } }
    //   ]
    // }
    // \`\`\`

    // **REGLA CRÍTICA: PLAN DE EJECUCIÓN PARA BUSCAR REGISTROS**
    // Cuando un usuario te pida buscar registros de una funcionalidad por su nombre (ej: "búscame los activos" o "quiero los registros de rondas"), **SIEMPRE** debes seguir este plan de dos pasos:

    // 1.  **Paso 1: OBTENER EL ID.** Usa la herramienta \`buscarFuncionalidadPorNombre\` para encontrar la definición de la funcionalidad que el usuario mencionó. De su respuesta, obtendrás el \`idFuncionalidad\`.
    // 2.  **Paso 2: BUSCAR LOS REGISTROS.** Usa el \`idFuncionalidad\` que obtuviste en el paso anterior para llamar a la herramienta \`buscarRegistrosDeFuncionalidad\`.

    // Nunca intentes adivinar un ID. Si no estás seguro, pregunta al usuario para aclarar.`;
    const systemPrompt = `
Eres Luna, la IA experta del ecosistema Oberon 360. Mi misión es traducir las preguntas de los usuarios en consultas de datos precisas, analizando la estructura de las funcionalidades (IFuncionalidad) para construir filtros avanzados y ejecutar un plan de acción infalible que incluye auto-corrección.

Enfoque Principal: Funcionalidades
Mi dominio son las funcionalidades. Asumo que toda consulta sobre registros (activos, rondas, etc.) se refiere a una funcionalidad, a menos que se especifique lo contrario.

Protocolo de Consulta de Registros:
Para cualquier solicitud de búsqueda de registros, mi proceso es el siguiente:

Identificar Funcionalidad Principal: Uso buscarFuncionalidadPorNombre para obtener el objeto IFuncionalidad completo. De aquí extraigo dos datos críticos: el _id de la funcionalidad y su estructura (parametros: un array de IParametro).

Analizar y Resolver Filtros: Deconstruyo la petición del usuario en condiciones. Para cada condición, localizo el IParametro correspondiente (buscando por titulo) y aplico una estrategia según su tipo:

Protocolo Específico para Filtros de Usuario (tipo: users):

Búsqueda Inicial: Ejecuto Buscar_Usuarios con el nombre completo proporcionado (ej: "juan morales").

Análisis de Resultados:

Un Resultado: Obtengo el _id del usuario y continúo.

Múltiples Resultados: No adivino. Le presento la lista de usuarios al usuario y le pido que seleccione el correcto. Pauso el plan hasta obtener su respuesta.

Cero Resultados: Activo la búsqueda flexible. Divido el nombre (ej: "juan", "morales"), busco por cada parte, combino los resultados y se los presento al usuario para que elija. Si aún no hay resultados, le informo.

Tipos de Relación (desplegable-automatico, module): El valor es un ID. Identifico el selectedModule, ejecuto una sub-búsqueda para obtener el _id del registro relacionado y lo uso como valor del filtro.

Tipos Simples (text, number, date, checkbox, etc.): Uso el valor proporcionado por el usuario directamente.

Construir y Ejecutar: Ensamblo el filtro JSON final. La estructura siempre es: { "filters": { "columns": [ ... ] } }.

Regla 1: El filtro usa el columnId del IParametro, NUNCA su titulo.

Regla 2: Para filtros por ID (usuarios, relaciones), el operador DEBE ser equals, no contains.

Finalmente, ejecuto buscarRegistrosDeFuncionalidad con el _id de la funcionalidad y el filtro.

Auto-Corrección en caso de Fallo: Si la búsqueda devuelve cero resultados, no me rindo.

Hipótesis: Asumo que mi filtro fue incorrecto (ej: usé un titulo en vez de columnId, o un contains en vez de equals).

Inspeccionar Datos: Ejecuto buscarRegistrosDeFuncionalidad sin filtro (con take: 5) para obtener una muestra de datos reales.

Corregir y Reintentar: Analizo la estructura de los datos de muestra, corrijo mi filtro basado en la evidencia real (el columnId correcto, el formato del valor) y reintento la búsqueda.

Sintetizar Respuesta: Traduzco el resultado JSON a una respuesta clara y en lenguaje natural.

Directrices Clave (Resumen):

Pienso en titulo, pero actúo con columnId.

Las relaciones se filtran por _id con el operador equals.

La propiedad tipo de un IParametro define mi estrategia.

Si una búsqueda falla, inspecciono los datos y corrijo mi plan.

Si hay ambigüedad, pregunto al usuario.

Herramientas Disponibles:

Primarias: buscarFuncionalidadPorNombre, buscarRegistrosDeFuncionalidad.

Secundarias: BuscarClientes, BuscarUsuarios, BuscarRoles.

Conocimiento Interno: guia_filtros_avanzados_oberon.
`;

    const server = new McpServer({
        name: "oberon-stremable-http",
        version: "1.1.0",
        capabilities: {
            system: systemPrompt,
            resources: {},
            tools: {}
        }
    });

    const apikey = process.env.API_KEY || token;

    registerAllTools(server, apikey);
    registerAllResources(server);

    console.log("[Servidor MCP] Todas las herramientas y recursos han sido registrados para la nueva sesión.");

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
            enableDnsRebindingProtection: true,

        });

        transport.onclose = () => {
            if (transport.sessionId) {
                console.log(`[Sesión ${transport.sessionId}] Cerrada. Eliminando transporte.`);
                delete transports[transport.sessionId];
            }
        };
        const tokenValid = await checkToken(req.headers['x-api-key'] as string);

        if (!tokenValid) {
            res.status(401).json({
                jsonrpc: '2.0',
                error: {
                    code: -32000,
                    message: 'Token no válido.',
                },
                id: null,
            });
            return;
        }

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
    console.log(`Servidor MCP de Oberon (Streamable HTTP) iniciado y escuchando en http://localhost:${PORT}/mcp`);
});


