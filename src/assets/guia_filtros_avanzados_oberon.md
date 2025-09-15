¡Excelente\! El registro de la conversación es increíblemente útil. Muestra un proceso de pensamiento avanzado que incluye auto-corrección y depuración. He integrado esa lógica, junto con tus nuevas reglas para la búsqueda de usuarios, en un prompt final, concreto y conciso.

Este prompt está diseñado para que Luna actúe exactamente como lo hizo en la parte final y más inteligente de esa conversación.

-----

### Archivo: `guia_filtros_avanzados_oberon.md`

````markdown
# Guía Definitiva para Filtros Avanzados en Oberon 360

Este documento es el recurso central para construir consultas de datos precisas dentro del ecosistema Oberon 360. El objetivo es traducir preguntas en lenguaje natural a filtros JSON que interactúan directamente con el motor de búsqueda.

### 1. Estructura Fundamental del Filtro

Toda búsqueda de registros en una funcionalidad se encapsula en un objeto principal. La estructura siempre debe seguir este formato:

```json
{
  "filters": {
    "columns": [
      {
        "ID_DE_LA_COLUMNA": {
          "value": {
            "OPERADOR": "VALOR"
          }
        }
      }
    ]
  }
}
````

**Regla de Oro:** La clave para identificar un campo no es su título visible (ej: "Estado de la Tarea"), sino su identificador único e inmutable: el **`columnId`**. Siempre debes obtener la estructura de la funcionalidad primero para conocer el `columnId` correcto de cada campo por el que deseas filtrar.

### 2\. Operadores de Comparación

Estos son los operadores que puedes usar dentro del objeto de filtro para definir tu condición.

| Operador   | Descripción                                                                                              | Ejemplo (dentro del objeto `value`)                                        |
| :--------- | :------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------- |
| `equals`   | El valor es exactamente igual al proporcionado.                                                          | `{ "equals": "68b0b60d20e2238582f4b16b" }`                                  |
| `notEquals`| El valor no es igual al proporcionado.                                                                   | `{ "notEquals": "ID_ESTADO_ARCHIVADO" }`                                   |
| `contains` | El valor (texto) contiene la cadena proporcionada. No distingue mayúsculas/minúsculas.                   | `{ "contains": "inspección" }`                                             |
| `startsWith`| El valor (texto) empieza con la cadena proporcionada.                                                      | `{ "startsWith": "REP-" }`                                                 |
| `endsWith` | El valor (texto) termina con la cadena proporcionada.                                                      | `{ "endsWith": ".pdf" }`                                                   |
| `gt`       | **G**reater **T**han. El valor es numéricamente mayor que.                                                 | `{ "gt": 500 }`                                                            |
| `gte`      | **G**reater **T**han or **E**qual. El valor es mayor o igual. Para fechas, usa el formato `AAAA-MM-DD`. | `{ "gte": "2025-09-01" }`                                                  |
| `lt`       | **L**ess **T**han. El valor es numéricamente menor que.                                                    | `{ "lt": 10 }`                                                             |
| `lte`      | **L**ess **T**han or **E**qual. El valor es menor o igual.                                                 | `{ "lte": "2025-09-15" }`                                                  |
| `in`       | El valor debe estar en la lista (array) proporcionada. Ideal para IDs.                                   | `{ "in": ["ID_USUARIO_1", "ID_USUARIO_2"] }`                                 |
| `nin`      | **N**ot **I**n. El valor NO debe estar en la lista proporcionada.                                          | `{ "nin": ["ID_ESTADO_COMPLETADO", "ID_ESTADO_CANCELADO"] }`                |
| `between`  | El valor está entre dos valores (inclusivo). Se provee un array de dos elementos.                          | `{ "between": ["2025-01-01", "2025-01-31"] }`                              |
| `exists`   | Verifica si un campo existe (o no) en el registro.                                                       | `{ "exists": false }`                                                      |

### 3\. Combinando Condiciones con Operadores Lógicos

Para filtros complejos, puedes anidar condiciones usando `$and` y `$or` a nivel de la lista `columns`.

**`$and`**: Deben cumplirse TODAS las condiciones. (Este es el comportamiento por defecto si simplemente listas varios objetos en el array `columns`).

**`$or`**: Debe cumplirse AL MENOS UNA de las condiciones.

```json
// Busca registros donde (el estado es 'Abierto' Y la prioridad es alta) O (el responsable es 'Juan Perez')
{
  "filters": {
    "columns": [
      {
        "$or": [
          {
            "$and": [
              { "ID_COL_ESTADO": { "value": { "equals": "ID_ESTADO_ABIERTO" } } },
              { "ID_COL_PRIORIDAD": { "value": { "gt": 4 } } }
            ]
          },
          { "ID_COL_RESPONSABLE": { "value": { "equals": "ID_JUAN_PEREZ" } } }
        ]
      }
    ]
  }
}
```

### 4\. Filtrado Específico por Tipo de Parámetro (`IParametro.tipo`)

La forma de construir el filtro depende críticamente del `tipo` del parámetro.

#### Tipos Simples (`text`, `textarea`, `number`, `email`, `date`, `time`, `checkbox`)

Estos campos se filtran directamente por su valor.

  * **Texto:** Usa `contains` (flexible) o `equals` (exacto).
  * **Número:** Usa `equals`, `gt`, `gte`, `lt`, `lte`.
  * **Fecha/Hora:** Usa `gte`, `lte`, `between`. El formato debe ser `AAAA-MM-DDTHH:mm:ss.sssZ`.
  * **Checkbox:** El valor es booleano (`true` o `false`). `{ "ID_COL_ES_NOVEDAD": { "value": { "equals": true } } }`

#### Tipos de Relación (`desplegable-automatico`, `users`, `module`)

Estos campos **almacenan el ID de un registro de otra funcionalidad**, no un texto. Filtrar por ellos es un proceso de dos pasos:

1.  **Obtener el ID del Registro Relacionado:** Primero debes buscar en la funcionalidad correspondiente para encontrar el `_id` del registro que te interesa.
2.  **Filtrar por ese ID:** Usa el `_id` obtenido en el filtro de la funcionalidad principal.

**Ejemplo Práctico:**

> **Petición:** "Búscame la trazabilidad donde el itinerario sea 'Edificio Oberon - Casa Juanito'".

1.  **Análisis:** Se busca en la funcionalidad "TRAZABILIDAD PROTOCOLOS" por el campo "ITINERARIO ASIGNADO".
2.  **Obtener Estructura:** Se obtiene la definición de "TRAZABILIDAD...". Se encuentra que "ITINERARIO ASIGNADO" tiene `columnId: "949d6f01lp"`, `tipo: "desplegable-automatico"` y `selectedModule: "68506d28..."` (el ID de la funcionalidad de "Itinerarios").
3.  **Resolver Dependencia:** Se busca en la funcionalidad de "Itinerarios" el registro con nombre "Edificio Oberon - Casa Juanito" y se obtiene su `_id`: `68b0b60d20e2238582f4b16b`.
4.  **Construir Filtro Final:**
    ```json
    {
      "filters": {
        "columns": [
          {
            "949d6f01lp": {
              "value": {
                "equals": "68b0b60d20e2238582f4b16b"
              }
            }
          }
        ]
      }
    }
    ```
