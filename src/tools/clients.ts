import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AxiosInstance } from "axios";
import z from "zod";
import { logToolExecution } from "../logging.js";


/**
 * Registra las herramientas de Clientes en el servidor MCP.
 * @param server La instancia del servidor MCP.
 * @param authToken El token de autenticación para usar en las llamadas a la API.
 */
export function registerClientsTool(server: McpServer, apiClient: AxiosInstance) {
    console.log(`[Tools] Registrando herramientas de Clientes en el servidor...`);


    // GET /core/clients
    server.tool(
        "Obtener_Clientes",
        "Busca y devuelve una lista detallada de clientes del sistema, incluyendo su rol, zona y ubicaciones. Devuelve datos en formato JSON parseable en el campo 'text'.",
        {
            terminoBusqueda: z.string().optional().describe("Texto para buscar por nombre de cliente."),
            cantidad: z.number().optional().default(10).describe("Número de clientes a devolver (por defecto 10)."),
            pagina: z.number().optional().default(1).describe("Número de página a devolver (por defecto 1)."),
            orden: z.enum(["ASC", "DESC"]).optional().default("ASC").describe("Orden de la lista de clientes (por defecto ASC)."),
        },
        async ({ terminoBusqueda, cantidad, pagina, orden }) => {
            logToolExecution({
                toolName: "Obtener Clientes",
                level: "INFO",
                parameters: { terminoBusqueda, cantidad, pagina, orden },
                status: "STARTED",
                message: "Iniciando ejecución de la herramienta Obtener Clientes.",
            });
            try {
                const params = { take: cantidad, term: terminoBusqueda, page: pagina, order: orden };
                console.log(`[Herramienta: obtenerClientes] Llamando a /core/clients con params:`, params);

                const response = await apiClient.get('/core/clients', {
                    params,
                });
                const clientes = response.data.data;
                const meta = response.data.meta;

                if (!clientes || clientes.length === 0) {
                    logToolExecution({
                        toolName: "Obtener Clientes",
                        level: "INFO",
                        parameters: { terminoBusqueda, cantidad, pagina, orden },
                        status: "SUCCESS",
                        message: "No se encontraron clientes que coincidan con la búsqueda.",
                        details: { clientesEncontrados: 0 }
                    });
                    const jsonResponse = JSON.stringify({
                        type: "list",
                        data: [],
                        count: 0,
                        meta: meta || {}
                    }, null, 2);
                    return { content: [{ type: "text", text: jsonResponse }] };
                }

                logToolExecution({
                    toolName: "Obtener Clientes",
                    level: "INFO",
                    parameters: { terminoBusqueda, cantidad, pagina, orden },
                    status: "SUCCESS",
                    message: `Se encontraron ${clientes.length} clientes.`,
                    details: { clientesEncontrados: clientes.length, meta }
                });
                const jsonResponse = JSON.stringify({
                    type: "list",
                    data: clientes,
                    count: clientes.length,
                    meta: meta || {}
                }, null, 2);
                return {
                    content: [
                        {
                            type: "text",
                            text: jsonResponse
                        },
                    ]
                };

            } catch (error: any) {
                logToolExecution({
                    toolName: "Obtener Clientes",
                    level: "ERROR",
                    parameters: { terminoBusqueda, cantidad, pagina, orden },
                    status: "FAILURE",
                    message: `Error al consultar la API de clientes: ${error.message}`,
                    details: { error: error.message, stack: error.stack }
                });
                console.error(`[Herramienta: obtenerClientes] Error: ${error.message}`);
                const errorJson = JSON.stringify({
                    type: "error",
                    message: "Ocurrió un error al consultar la API de clientes.",
                    details: { error: error.message }
                }, null, 2);
                return { content: [{ type: "text", text: errorJson }] };
            }
        }
    );

    // GET /core/clients/{id}
    server.tool(
        "Obtener_Cliente_por_ID",
        "Busca y devuelve un cliente del sistema, incluyendo su rol, zona y ubicaciones. Devuelve datos en formato JSON parseable en el campo 'text'.",
        {
            id: z.string().describe("ID del cliente a buscar."),
        },
        async ({ id }) => {
            logToolExecution({
                toolName: "Obtener Cliente por ID",
                level: "INFO",
                parameters: { id },
                status: "STARTED",
                message: "Iniciando ejecución de la herramienta Obtener Cliente por ID.",
            });
            try {
                console.log(`[Herramienta: obtenerCliente] Llamando a /core/clients/${id}...`);

                const response = await apiClient.get('/core/clients/' + id, {
                });
                const clientes = response.data.data;
                const meta = response.data.meta;

                if (!clientes || clientes.length === 0) {
                    logToolExecution({
                        toolName: "Obtener Cliente por ID",
                        level: "INFO",
                        parameters: { id },
                        status: "SUCCESS",
                        message: "No se encontraron clientes que coincidan con la búsqueda.",
                        details: { clientesEncontrados: 0 }
                    });
                    const jsonResponse = JSON.stringify({
                        type: "detail",
                        data: null,
                        meta: { found: false }
                    }, null, 2);
                    return { content: [{ type: "text", text: jsonResponse }] };
                }

                const cliente = clientes[0];
                logToolExecution({
                    toolName: "Obtener Cliente por ID",
                    level: "INFO",
                    parameters: { id },
                    status: "SUCCESS",
                    message: `Se encontró 1 cliente.`,
                    details: { clienteEncontrado: cliente, meta }
                });
                const jsonResponse = JSON.stringify({
                    type: "detail",
                    data: cliente,
                    meta: { found: true, ...meta }
                }, null, 2);
                return {
                    content: [
                        {
                            type: "text",
                            text: jsonResponse
                        },
                    ]
                };

            } catch (error: any) {
                logToolExecution({
                    toolName: "Obtener Cliente por ID",
                    level: "ERROR",
                    parameters: { id },
                    status: "FAILURE",
                    message: `Error al consultar la API de clientes por ID: ${error.message}`,
                    details: { error: error.message, stack: error.stack }
                });
                console.error(`[Herramienta: obtenerCliente] Error: ${error.message}`);
                const errorJson = JSON.stringify({
                    type: "error",
                    message: "Ocurrió un error al consultar la API de clientes.",
                    details: { error: error.message }
                }, null, 2);
                return { content: [{ type: "text", text: errorJson }] };
            }
        }
    );
}
