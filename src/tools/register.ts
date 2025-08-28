import { registerClientsTool } from "./clients.js";
import { registerUsersTool } from "./users.js";
import { registerRolesTool } from "./roles.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Registra todas las herramientas disponibles en el servidor MCP.
 * @param server La instancia del servidor MCP.
 * @param authToken El token de autenticación para las herramientas.
 */
export function registerAllTools(server: McpServer) {
    // Ahora pasamos el token a cada función de registro
    registerClientsTool(server);
    registerUsersTool(server);
    registerRolesTool(server);
}