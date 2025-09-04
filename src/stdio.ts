import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/register.js";

const server = new McpServer({
    name: "oberon-api-stdio",
    version: "1.0.0"
});


async function main() {
    const transport = new StdioServerTransport();
    registerAllTools(server, process.env.API_KEY || "");
    await server.connect(transport);
    console.error("Servidor MCP de Oberon iniciado y escuchando en stdio...");
}

main().catch((error) => {
    console.error("Error fatal en la ejecución del servidor:", error);
    process.exit(1);
});