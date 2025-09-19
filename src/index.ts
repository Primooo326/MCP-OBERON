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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};
const PORT = 3001;


function createConfiguredMcpServer(token: string): McpServer {

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

Exportación a Excel en Funcionalidades: Las tools Obtener_Funcionalidades y Buscar_Registros_De_Funcionalidad soportan el parámetro exportToExcel (booleano, default false). Si el usuario pide exportar datos a Excel, descargar la lista o analizar offline, usa exportToExcel: true en la tool correspondiente. Esto genera un archivo .xlsx con timestamp en /assets/, y proporciona la URL de descarga en meta.excelUrl y meta.excelFilename. Ofrece proactivamente la exportación si hay muchos resultados (e.g., >20) para facilitar el análisis offline.

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


