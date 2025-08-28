import express, { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { registerAllTools } from "./tools/register.js";
import { authenticateWithBackend } from "./auth.js";
import dotenv from "dotenv";

dotenv.config();

// Extendemos el objeto Request de Express para poder adjuntar el token
interface AuthenticatedRequest extends Request {
    token?: string;
}

// Creamos una aplicación Express
const app = express();
app.use(express.json());

// Un mapa para almacenar las instancias de transporte activas por ID de sesión
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};
const PORT = 3000;


function createConfiguredMcpServer(): McpServer {
    const server = new McpServer({
        name: "oberon-api",
        version: "1.0.0",
        capabilities: {
            resources: {},
            tools: {},
        },
    });

    console.log("[Servidor MCP] Nueva instancia creada. Registrando herramientas...");
    // Pasamos el token a la función que registra las herramientas
    registerAllTools(server);
    console.log("[Servidor MCP] Todas las herramientas han sido registradas para la nueva sesión.");

    return server;
}

// --- NUEVAS RUTAS DE AUTENTICACIÓN ---

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'El nombre de usuario y la contraseña son requeridos.' });
    }

    try {
        const token = await authenticateWithBackend(username, password);
        res.json({ token });
    } catch (error) {
        res.status(401).json({ error: (error as Error).message });
    }
});


// --- RUTAS MCP PROTEGIDAS ---

// Ruta principal para la comunicación MCP. Ahora está protegida por el middleware.
app.post('/mcp', async (req: AuthenticatedRequest, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
        // Si la sesión ya existe, reutilizamos su transporte
        transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
        // Si es una nueva petición de inicialización, creamos un nuevo transporte y servidor
        console.log("Recibida nueva solicitud de inicialización. Creando sesión...");

        transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (newSessionId) => {
                // Almacenamos el transporte cuando la sesión se inicializa con éxito
                transports[newSessionId] = transport;
                console.log(`[Sesión ${newSessionId}] Creada y almacenada.`);
            },
        });

        // Limpiamos el transporte del mapa cuando la conexión se cierra
        transport.onclose = () => {
            if (transport.sessionId) {
                console.log(`[Sesión ${transport.sessionId}] Cerrada. Eliminando transporte.`);
                delete transports[transport.sessionId];
            }
        };

        // Creamos una nueva instancia del servidor MCP, ahora pasando el token
        const server = createConfiguredMcpServer(); // El token está disponible gracias al middleware

        // Conectamos el servidor al nuevo transporte
        await server.connect(transport);
    } else {
        // Si la petición no es válida
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

    // Finalmente, dejamos que el transporte maneje la petición
    await transport.handleRequest(req, res, req.body);
});

// Función reutilizable para las peticiones GET y DELETE
const handleSessionRequest = async (req: express.Request, res: express.Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
        res.status(400).send('ID de sesión inválido o faltante');
        return;
    }

    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
};

// Estas rutas también deberían estar protegidas si quieres que solo usuarios autenticados puedan usarlas.
app.get('/mcp', handleSessionRequest);
app.delete('/mcp', handleSessionRequest);


// Iniciamos el servidor Express
app.listen(PORT, () => {
    console.log(`Servidor MCP de Oberon (Streamable HTTP) iniciado y escuchando en http://localhost:${PORT}`);
    console.log('Ruta de login disponible en POST http://localhost:3000/login');
});


