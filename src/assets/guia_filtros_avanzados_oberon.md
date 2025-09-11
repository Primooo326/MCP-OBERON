# Guía para Búsquedas y Filtros Avanzados en Oberon 360

Para realizar búsquedas avanzadas, debes construir un objeto de filtro en formato JSON. Este objeto se traduce internamente en una consulta a la base de datos MongoDB.

### Estructura Básica

La estructura general para filtrar por un campo es:

`{ "nombre_del_campo": { "operador": "valor" } }`

Cuando buscas en registros de una funcionalidad, el `"nombre_del_campo"` DEBE ser el **título visible del campo** (ej: "Nombre del Cliente", "Estado de la Tarea"). La herramienta se encargará de traducirlo al ID interno. Para búsquedas en funcionalidades (admin), usa el nombre de la propiedad del esquema (ej: "name", "moduleType").

En el caso de registros de una funcionalidad, a veces un campo tiene un sub-objeto `value`, la estructura es:
`{ "nombre_del_campo": { "value": { "operador": "valor" } } }`

### Operadores Disponibles

| Operador | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `equals` | El valor del campo es exactamente igual al proporcionado. | `{ "status": { "equals": "Activo" } }` |
| `notEquals` | El valor del campo no es igual al proporcionado. | `{ "status": { "notEquals": "Archivado" } }` |
| `contains` | El valor del campo (texto) contiene la cadena proporcionada. No distingue mayúsculas/minúsculas. | `{ "name": { "contains": "prueba" } }` |
| `startsWith`| El valor del campo (texto) empieza con la cadena proporcionada. | `{ "username": { "startsWith": "admin" } }` |
| `endsWith` | El valor del campo (texto) termina con la cadena proporcionada. | `{ "email": { "endsWith": "@tsi.com.co" } }` |
| `gt` | "Greater Than". El valor es mayor que el proporcionado. | `{ "priority": { "gt": 3 } }` |
| `gte` | "Greater Than or Equal". El valor es mayor o igual. | `{ "createdAt": { "gte": "2025-09-01" } }` |
| `lt` | "Less Than". El valor es menor que el proporcionado. | `{ "stock": { "lt": 10 } }` |
| `lte` | "Less Than or Equal". El valor es menor o igual. | `{ "updatedAt": { "lte": "2025-09-11" } }` |
| `in` | El valor del campo debe estar en la lista (array) proporcionada. | `{ "statusId": { "in": [1, 2, 5] } }` |
| `nin` | "Not In". El valor del campo NO debe estar en la lista proporcionada. | `{ "userId": { "nin": ["user1", "user2"] } }` |
| `between` | El valor está entre dos valores (inclusivo). Se provee un array de dos elementos. | `{ "fecha_evento": { "between": ["2025-01-01", "2025-01-31"] } }` |
| `exists` | Verifica si un campo existe o no en el documento. | `{ "fecha_cierre": { "exists": false } }` |
| `elemMatch` | Busca documentos que contengan un array con al menos un elemento que coincida con todas las condiciones especificadas. | `{ "parametros": { "elemMatch": { "titulo": "Estado", "obligatorio": true } } }`|

### Combinando Condiciones con Operadores Lógicos

Puedes anidar múltiples condiciones usando los operadores `$and`, `$or` y `$nor`. Estos operadores esperan un array de objetos de filtro.

**`$and`**: Deben cumplirse TODAS las condiciones.

```json
{
  "$and": [
    { "moduleType": { "equals": 2 } },
    { "name": { "startsWith": "Reporte" } }
  ]
}