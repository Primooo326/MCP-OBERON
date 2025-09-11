import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerFunctionalitiesResource } from "./functionalities.js";
import { registerOberonResource } from "./oberon.js";



export function registerAllResources(server: McpServer) {

    registerFunctionalitiesResource(server);
    registerOberonResource(server);
}