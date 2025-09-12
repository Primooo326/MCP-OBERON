import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { AxiosInstance } from "axios";
import z from "zod";
import { logToolExecution } from "../logging.js";

function formatCliente(c: any) {
    const ubicacionesFormateadas = c.locationClient && c.locationClient.length > 0
        ? c.locationClient.map((loc: any) =>
            `  - ${loc.descriptionAddress || 'Sin descripción'}\n    Dirección: ${loc.address}\n    Estado: ${loc.status ? 'Activa' : 'Inactiva'}   \n    ID: ${loc.id}`
        ).join('\n')
        : "  Sin ubicaciones registradas";
    const modulosFormateados = c.clientProjectModule && c.clientProjectModule.length > 0
        ? `  Total de Módulos: ${c.clientProjectModule.length}\n  Módulos Activos: ${c.clientProjectModule.filter((m: any) => m.status).length}`
        : "  Sin módulos asignados";
    const estado = c.status ? "Activo" : "Inactivo";
    return `
=========================================
🏢 CLIENTE: ${c.name} (${c.commercialName})
-----------------------------------------
--- INFORMACIÓN PRINCIPAL ---
ID Cliente: ${c.id}
NIT: ${c.nit}
Estado: ${estado}
Número de Usuarios: ${c.numberUsers}
URL Logo: ${c.urlLogo || 'No especificada'}

--- UBICACIONES ---
${ubicacionesFormateadas}

--- MÓDULOS DEL PROYECTO ---
${modulosFormateados}

--- METADATOS ---
Fecha de Creación: ${c.insertDate}
Última Actualización por Usuario: ${c.lastUpdateUser}
=========================================
    `.trim();
}

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
        "Busca y devuelve una lista detallada de clientes del sistema, incluyendo su rol, zona y ubicaciones.",
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
                    return { content: [{ type: "text", text: "No se encontraron clientes que coincidan con la búsqueda." }] };
                }

                const textoFormateado = clientes.map((c: any) => formatCliente(c).trim()).join('\n\n');

                logToolExecution({
                    toolName: "Obtener Clientes",
                    level: "INFO",
                    parameters: { terminoBusqueda, cantidad, pagina, orden },
                    status: "SUCCESS",
                    message: `Se encontraron ${clientes.length} clientes.`,
                    details: { clientesEncontrados: clientes.length, meta }
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: `Se encontraron ${clientes.length} clientes:\n\n${textoFormateado}`,
                            "_meta": meta
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
                return { content: [{ type: "text", text: "Ocurrió un error al consultar la API de clientes." }] };
            }
        }
    );

    // GET /core/clients/{id}
    server.tool(
        "Obtener_Cliente_por_ID",
        "Busca y devuelve un cliente del sistema, incluyendo su rol, zona y ubicaciones.",
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
                    return { content: [{ type: "text", text: "No se encontraron clientes que coincidan con la búsqueda." }] };
                }

                const textoFormateado = clientes.map((c: any) => formatCliente(c).trim()).join('\n\n');

                logToolExecution({
                    toolName: "Obtener Cliente por ID",
                    level: "INFO",
                    parameters: { id },
                    status: "SUCCESS",
                    message: `Se encontró 1 cliente.`,
                    details: { clienteEncontrado: clientes[0], meta }
                });
                return {
                    content: [
                        {
                            type: "text",
                            text: `Se encontraron ${clientes.length} clientes:\n\n${textoFormateado}`,
                            "_meta": meta
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
                return { content: [{ type: "text", text: "Ocurrió un error al consultar la API de clientes." }] };
            }
        }
    );
}
