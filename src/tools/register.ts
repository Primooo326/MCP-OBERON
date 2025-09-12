import { registerClientsTool } from "./clients.js";
import { registerUsersTool } from "./users.js";
import { registerRolesTool } from "./roles.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createAxiosInstance } from "../constants.js";
import { registerFunctionalitiesTool } from "./functionalities.js";

/**
 * Registra todas las herramientas disponibles en el servidor MCP.
 * @param server La instancia del servidor MCP.
 * @param authToken El token de autenticación para las herramientas.
 */
export function registerAllTools(server: McpServer, token: string) {


    const axiosInstance = createAxiosInstance(token);

    registerFunctionalitiesTool(server, axiosInstance);
    registerClientsTool(server, axiosInstance);
    registerUsersTool(server, axiosInstance);
    registerRolesTool(server, axiosInstance);
}