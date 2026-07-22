import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerFunctionalitiesResource } from "./functionalities.js";
import { registerOberonResource } from "./oberon.js";
import { registerSkillsResources } from "./skills.js";



export function registerAllResources(server: McpServer) {

    registerFunctionalitiesResource(server);
    registerOberonResource(server);
    registerSkillsResources(server);
}