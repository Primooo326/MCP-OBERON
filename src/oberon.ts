import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/register.js";

export const server = new McpServer({
    name: "oberon-api",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});

console.log("[Servidor MCP] Instancia creada. Registrando herramientas...");

registerAllTools(server);

console.log("[Servidor MCP] Todas las herramientas han sido registradas.");


async function main() {

    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error("Servidor MCP de Oberon iniciado y escuchando en stdio...");
}

main().catch((error) => {
    console.error("Error fatal en la ejecución del servidor:", error);
    process.exit(1);
});