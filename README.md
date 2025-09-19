PARA CONECTAR localhost:3000/mcp

token: x-api-key='APIKEY'


documentacion de el schema de coneccion del json https://gemini-cli.xyz/docs/en/tools/mcp-server#discovery-process-deep-dive

ejemplo json :
## Nueva Funcionalidad: Exportación a Excel en Tools de Funcionalidades

Se ha agregado soporte para exportar datos a Excel en las tools de funcionalidades (`Obtener_Funcionalidades` y `Buscar_Registros_De_Funcionalidad`).

### Cómo Usar
- Agrega el parámetro `exportToExcel: true` al input de la tool.
- Si se especifica, después de obtener los datos, se genera un archivo Excel (.xlsx) con:
  - Headers basados en las keys de los objetos (o títulos mapeados para registros).
  - Filas con los datos obtenidos.
  - Nombre del archivo: `{prefix}-YYYY-MM-DDTHH-mm-ss.xlsx` (timestamp único).
- El archivo se guarda en `src/assets/` y se sirve estáticamente en `http://localhost:3001/assets/`.
- En la respuesta JSON, se agrega a `meta`:
  - `excelFilename`: Nombre del archivo.
  - `excelUrl`: URL completa para descargar (e.g., `http://localhost:3001/assets/funcionalidades-2025-09-19T17-26-40.xlsx`).

### Ejemplo de Uso
Para `Obtener_Funcionalidades`:
```
{
  "filtro": { ... },
  "cantidad": 10,
  "pagina": 1,
  "exportToExcel": true
}
```

La respuesta incluirá el JSON normal + meta con excelUrl. Descarga el archivo accediendo a la URL.

Esto permite exportar listas de funcionalidades o registros directamente a Excel para análisis offline.
