import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fs from "fs/promises";
import { fileURLToPath } from "node:url";
import * as path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SKILLS_DIR = path.join(__dirname, "../assets/skills");

const SKILL_REGISTRY = [
    {
        id: "skill_crear_usuario",
        uri: "file:///skills/crear-usuario.md",
        title: "Skill: Crear Usuario",
        description: "Guía paso a paso para crear un usuario: obtener roles, solicitar datos y ejecutar la creación.",
        fileName: "crear-usuario.md",
    },
];

export function registerSkillsResources(server: McpServer) {
    for (const skill of SKILL_REGISTRY) {
        server.resource(
            skill.id,
            skill.uri,
            {
                title: skill.title,
                description: skill.description,
                mimeType: "text/markdown",
            },
            async (uri) => {
                const filePath = path.join(SKILLS_DIR, skill.fileName);
                return {
                    contents: [{
                        uri: uri.href,
                        text: await fs.readFile(filePath, "utf8"),
                    }]
                };
            }
        );
    }
}
