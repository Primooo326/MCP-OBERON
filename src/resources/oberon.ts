import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerOberonResource(server: McpServer) {
    server.resource(
        "oberon context",
        "config://oberon",
        {
            title: "Application Config",
            description: "Application configuration data",
            mimeType: "text/plain"
        },
        async (uri) => ({
            contents: [{
                uri: uri.href,
                text: `Nombre del Proyecto: Oberon 360
Empresa: TSI (Thomas Seguridad Integral)
Página Web: https://oberontsi.com/

Resumen del Ecosistema Oberon 360:
Oberon 360 es el ecosistema digital propietario de TSI, que representa la espina dorsal de todos los servicios de seguridad de la compañía. Nacida de una alianza estratégica y reenfocada en 2023 hacia un nuevo modelo de seguridad basado en tecnología, TSI utiliza Oberon 360 para transformar la seguridad tradicional en una red de inteligencia operativa. La filosofía no es simplemente mitigar riesgos, sino transformarlos en oportunidades para impulsar la competitividad y la continuidad del negocio de sus clientes.

Oberon 360 materializa el concepto de una "arquitectura viva de seguridad" que actúa de forma preventiva. Esto se logra a través de tres componentes clave:

Gestores Operacionales en Campo: Ejecutan protocolos y recolectan datos cruciales.

Analistas de Información: Identifican patrones y generan alertas desde centros de control.

Gestores de Riesgos Motorizados: Validan, reaccionan y refuerzan tácticamente en el terreno.

El Rol de la Plataforma de Configuración de Módulos (MCP):
Para que esta "arquitectura viva" sea ágil y adaptable, el Ingeniero Juan Morales ha desarrollado el MCP como su motor central. El MCP es un sistema backend (construido con TypeScript y MongoDB) que permite la creación dinámica y sin código de los módulos (formularios, tablas de datos, dashboards) que utilizan todos los componentes de Oberon 360.

Funcionamiento Técnico del MCP:

La entidad central del MCP es el esquema IFuncionalidad. Cada documento IFuncionalidad en la base de datos define una herramienta digital específica que los gestores o analistas utilizarán. Por ejemplo, un formulario para un reporte de incidentes en campo o un dashboard de seguimiento de activos en tiempo real.

La propiedad parametros dentro de cada IFuncionalidad es el "plano" que construye la interfaz. Define cada campo que un gestor debe llenar, cada columna que un analista debe ver, y cada métrica que un dashboard debe mostrar.

De esta manera, cuando TSI necesita ajustar un protocolo, agregar un nuevo tipo de dato a recolectar, o crear un nuevo reporte, puede hacerlo configurando un módulo en el MCP en lugar de requerir un ciclo de desarrollo de software. Esta agilidad es fundamental para la promesa de Oberon 360 de anticipar riesgos y adaptarse a un entorno en constante evolución.

En resumen, este contexto se proporciona a la IA para que entienda que los esquemas técnicos (IFuncionalidad, IParametro, etc.) no son solo una definición de software, sino la implementación directa de la estrategia de negocio de TSI y el corazón operativo de su ecosistema de seguridad inteligente, Oberon 360.`,
            }]
        })
    );
}