import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerFleetPrompts } from "./fleet.js";

/**
 * Registra todos los prompts estructurados disponibles en el servidor MCP.
 * @param server La instancia del servidor MCP.
 */
export function registerAllPrompts(server: McpServer) {
    registerFleetPrompts(server);
}
