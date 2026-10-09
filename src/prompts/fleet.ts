import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";

/**
 * Registra los prompts de análisis operativo para flotas, rutas y monitoreo.
 */
export function registerFleetPrompts(server: McpServer) {
    console.log(`[Prompts] Registrando prompts de Flotas y Monitoreo en el servidor...`);

    // 1. Análisis de desviaciones activas en tiempo real
    server.prompt(
        "analisis_desviaciones_activas",
        "Guía al agente para auditar vehículos con desviaciones de ruta activas, evaluar el nivel de severidad y generar un plan de acción para el centro de control.",
        {
            locationClient: z.string().optional().describe("ID de sede o cliente opcional a auditar."),
            prioridad: z.string().optional().describe("Nivel de prioridad o filtro de interés (ej: ALTA, MEDIA, TODAS).")
        },
        async ({ locationClient, prioridad }) => {
            return {
                description: "Auditoría en tiempo real de desviaciones de ruta en curso.",
                messages: [
                    {
                        role: "user",
                        content: {
                            type: "text",
                            text: `Actúa como especialista de monitoreo y seguridad operativa de Oberon 360.
Debes realizar una auditoría inmediata de desviaciones de ruta activas.

Instrucciones paso a paso:
1. Ejecuta la herramienta 'Consultar_Desviaciones_Activas' ${locationClient ? `filtrando por locationClient '${locationClient}'` : "sin filtro de sede para ver toda la flota"}.
2. Si se detectan vehículos en desvío:
   - Para cada placa, evalúa la severidad según la distancia desviada (en metros) y tiempo de reporte:
     * Crítica: > 1,000 metros de desvío o más de 30 minutos sin corrección.
     * Media: Entre 300 y 1,000 metros.
     * Baja/Preventiva: < 300 metros.
   ${prioridad ? `- Enfócate prioritariamente en eventos con severidad '${prioridad}'.` : ""}
   - Si una placa está en estado crítico, ejecuta 'Verificar_Estado_GPS_Placa' con la placa correspondiente para validar la última velocidad, ignición y reporte satelital.
3. Presenta un informe estructurado al operador con:
   - Tabla con columnas: Placa | Itinerario | Distancia Desvío | Última Coordenada | Nivel de Riesgo
   - Resumen ejecutivo de la situación actual.
   - Acciones tácticas recomendadas inmediatas (ej: contactar conductor, verificar con gestor en campo, despachar patrulla de reacción).
4. Si no hay desviaciones activas, confirma que todas las rutas se encuentran dentro del corredor autorizado.`
                        }
                    }
                ]
            };
        }
    );

    // 2. Auditoría histórica de cumplimiento de itinerarios
    server.prompt(
        "auditoria_cumplimiento_itinerarios",
        "Guía al agente para evaluar la puntualidad y cumplimiento de itinerarios en un periodo de fechas determinado, generando un informe ejecutivo de SLA.",
        {
            fechaInicio: z.string().describe("Fecha inicial de evaluación (formato YYYY-MM-DD)."),
            fechaFin: z.string().describe("Fecha final de evaluación (formato YYYY-MM-DD)."),
            placas: z.string().optional().describe("Placa o placas a evaluar (separadas por comas, ej: 'ABC123,XYZ789').")
        },
        async ({ fechaInicio, fechaFin, placas }) => {
            const listaPlacas = placas ? placas.split(",").map(p => p.trim()).filter(Boolean) : undefined;
            const placasStr = listaPlacas ? JSON.stringify(listaPlacas) : "toda la flota";

            return {
                description: `Auditoría de cumplimiento de itinerarios entre ${fechaInicio} y ${fechaFin}.`,
                messages: [
                    {
                        role: "user",
                        content: {
                            type: "text",
                            text: `Actúa como analista de gestión operativa de Oberon 360.
Debes realizar una auditoría de puntualidad y cumplimiento de itinerarios para el periodo comprendido entre '${fechaInicio}' y '${fechaFin}' sobre ${placasStr}.

Instrucciones paso a paso:
1. Ejecuta la herramienta 'Consultar_Cumplimiento_Itinerario' pasando fechaInicio='${fechaInicio}', fechaFin='${fechaFin}' ${listaPlacas ? `y placas=${JSON.stringify(listaPlacas)}` : ""}.
2. Con los resultados obtenidos, calcula y presenta los siguientes indicadores:
   - Total de servicios / itinerarios programados.
   - Servicios a tiempo (ON_TIME) vs fuera de ventana horaria (OUTSIDE_WINDOW) vs pendientes (PENDING).
   - Porcentaje de puntualidad (% SLA = ON_TIME / Total evaluados).
   - Promedio de minutos de retraso en salida y en llegada.
3. Identifica y destaca los 3 casos más críticos con mayor tiempo de retraso.
4. Complementa con 'Resumen_Desviaciones_Ruta' para el mismo rango de fechas (${fechaInicio} a ${fechaFin}) para verificar si los retrasos estuvieron asociados a desvíos de ruta físicos.
5. Emite conclusiones operativas y oportunidades de mejora para la planeación de rutas.`
                        }
                    }
                ]
            };
        }
    );
}
