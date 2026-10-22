# Servidor MCP - Oberon 360

Servidor MCP (Model Context Protocol) basado en Streamable HTTP para la interacción de agentes de IA con el ecosistema de Oberon 360.

## Conexión

* **URL del servidor:** `http://localhost:3001/mcp`
* **Autenticación:** Requiere la cabecera `x-api-key: <TU_TOKEN_JWT_O_APIKEY>`
* **Variables de entorno:** Consulta `.env.example` para configurar `API_BASE_URL`, `PORT`, etc.

## Scripts Disponibles

* `npm run dev`: Inicia el servidor en modo desarrollo con nodemon.
* `npm run build`: Compila el código TypeScript y copia los assets estáticos a `build/`.
* `npm start`: Inicia el servidor compilado en producción (`node build/index.js`).
* `npm test`: Ejecuta la suite de pruebas unitarias con Jest.
* `npm run inspect`: Inicia el inspector oficial de MCP apuntando a `http://localhost:3001/mcp`.

## Exportación a Excel en Herramientas de Funcionalidades

Soporte integrado para exportar datos a Excel en las herramientas de funcionalidades (`Obtener_Funcionalidades` y `Buscar_Registros_De_Funcionalidad`).

### Cómo Usar
* Agrega el parámetro `exportToExcel: true` al invocar la herramienta.
* Se genera un archivo Excel (.xlsx) con:
  * Cabeceras con los nombres/títulos de columnas.
  * Filas con los datos obtenidos.
  * Nombre del archivo: `{prefix}-YYYY-MM-DDTHH-mm-ss.xlsx` con timestamp único.
* El archivo se genera en la carpeta local `downloads/` y se expone estáticamente en `http://localhost:3001/downloads/`.
* En la respuesta JSON de la tool, dentro del objeto `meta` se incluyen:
  * `excelFilename`: Nombre del archivo generado.
  * `excelUrl`: URL directa de descarga (ej. `http://localhost:3001/downloads/funcionalidades-2026-10-21T12-00-00.xlsx`).

### Ejemplo de Parámetros
```json
{
  "filtro": {},
  "cantidad": 10,
  "pagina": 1,
  "exportToExcel": true
}
```
