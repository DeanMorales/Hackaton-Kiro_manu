# Requirements Document

## Introduction

Esta feature migra el leaderboard de "Torre de las Nubes — Duelo AWS" de un almacenamiento local por dispositivo (localStorage) a un leaderboard global persistente respaldado por AWS DynamoDB, expuesto vía API Gateway REST + Lambda. El frontend (Vite + ES modules) se despliega automáticamente en AWS Amplify Hosting con CI/CD desde GitHub. El diseño respeta la abstracción `ScoreStore` existente: la nueva implementación `DynamoDBScoreStore` es un drop-in replacement que no modifica `ScoreManager` ni la lógica de juego.

---

## Glossary

- **ScoreStore**: Clase abstracta en `src/data/scoreStore.js` que define la interfaz `load() / save() / clear()` en Promises para cualquier backend de almacenamiento de scores.
- **LocalStorageScoreStore**: Implementación concreta de `ScoreStore` que persiste scores en `localStorage` del navegador. Se usa como fallback cuando no hay API configurada.
- **DynamoDBScoreStore**: Nueva implementación concreta de `ScoreStore` que persiste scores en DynamoDB vía HTTP (API Gateway + Lambda).
- **ScoreManager**: Orquestador en `src/data/scoreManager.js` que recibe un `ScoreStore` por inyección de dependencias. Mantiene caché en memoria y calcula rank e `isNewRecord`.
- **Score**: Objeto JSON con la forma `{ "id": string, "name": string, "score": number, "timestamp": string (ISO 8601) }`.
- **Tabla_DynamoDB**: Tabla AWS DynamoDB con nombre `torre-nubes-scores`, clave primaria `id` (String).
- **GSI**: Global Secondary Index `gameId-score-index` sobre la `Tabla_DynamoDB`, con PK `gameId` (String) y SK `score` (Number), que permite consultar el top global en orden descendente.
- **Lambda**: Función AWS Lambda Node.js `torre-nubes-scores-api` que implementa los endpoints `GET /scores`, `POST /scores` y `DELETE /scores`.
- **API_Gateway**: API REST de AWS API Gateway que expone la `Lambda` con el recurso `/scores`, CORS habilitado y stage `prod`.
- **VITE_SCORES_API_URL**: Variable de entorno de Vite que contiene la URL base del `API_Gateway`. Si está definida (non-empty string), el sistema usa `DynamoDBScoreStore`; si no está definida o es vacía, usa `LocalStorageScoreStore`.
- **Amplify_Hosting**: Servicio AWS Amplify Hosting que sirve el build estático de Vite (`dist/`) con CDN global y CI/CD automático.
- **amplify.yml**: Archivo de configuración del pipeline de build en el repositorio, leído por `Amplify_Hosting`.
- **Dominio_Amplify**: URL pública asignada por `Amplify_Hosting` al despliegue, con formato `https://<branch>.<appId>.amplifyapp.com`.
- **gameId**: Atributo de partición del `GSI`; todos los scores del juego usan el valor fijo `"global"` para que el GSI agrupe el leaderboard completo.

---

## Requirements

### Requirement 1: Implementación de DynamoDBScoreStore

**User Story:** Como desarrollador, quiero una implementación de `ScoreStore` que persista scores en DynamoDB vía API Gateway, para que el leaderboard sea global y compartido entre todos los jugadores.

#### Acceptance Criteria

1. THE `DynamoDBScoreStore` SHALL extend `ScoreStore` e implementar los métodos `load()`, `save(scores)` y `clear()`, cada uno retornando una `Promise` que se resuelve con el tipo correspondiente: `load()` resuelve con `Score[]`, `save()` y `clear()` resuelven con `undefined`.
2. WHEN `DynamoDBScoreStore.load()` es invocado, THE `DynamoDBScoreStore` SHALL realizar una petición HTTP GET a `{apiUrl}/scores` y retornar el array de `Score` recibido ordenado de mayor a menor por el campo `score`.
3. IF `DynamoDBScoreStore.load()` falla por error HTTP o de red, THEN THE `DynamoDBScoreStore` SHALL capturar el error, registrarlo en consola y retornar un array vacío `[]` sin propagar la excepción.
4. WHEN `DynamoDBScoreStore.save(scores)` es invocado con un array no vacío, THE `DynamoDBScoreStore` SHALL identificar el `Score` con el `timestamp` más reciente del array y enviar una petición HTTP POST a `{apiUrl}/scores` con ese `Score` serializado como JSON en el cuerpo.
5. WHEN `DynamoDBScoreStore.save(scores)` es invocado con un array vacío, THE `DynamoDBScoreStore` SHALL retornar inmediatamente sin realizar ninguna petición HTTP.
6. WHEN `DynamoDBScoreStore.clear()` es invocado, THE `DynamoDBScoreStore` SHALL enviar una petición HTTP DELETE a `{apiUrl}/scores`.
7. IF una petición HTTP realizada por `DynamoDBScoreStore` devuelve un código de estado distinto de 2xx, THEN THE `DynamoDBScoreStore` SHALL registrar el error en consola y retornar sin lanzar una excepción no capturada, de modo que `ScoreManager` pueda continuar operando.
8. IF una petición HTTP realizada por `DynamoDBScoreStore` falla por error de red (sin respuesta del servidor), THEN THE `DynamoDBScoreStore` SHALL capturar el error, registrarlo en consola y retornar sin propagar la excepción.
9. THE `DynamoDBScoreStore` SHALL aceptar la URL base del `API_Gateway` como argumento del constructor y eliminar el carácter `/` final si está presente, antes de construir las rutas de los endpoints.

---

### Requirement 2: Selección dinámica del store en ScoreManager

**User Story:** Como desarrollador, quiero que la aplicación seleccione automáticamente el backend de almacenamiento según la variable de entorno `VITE_SCORES_API_URL`, para que el juego funcione en local sin configuración adicional y use DynamoDB en producción.

#### Acceptance Criteria

1. WHEN la aplicación se inicializa y `import.meta.env.VITE_SCORES_API_URL` contiene un string con longitud mayor a 0, THE módulo `scoreManager.js` SHALL exportar un singleton `scoreStore` de tipo `DynamoDBScoreStore` construido con ese valor como URL base, y un singleton `scoreManager` de tipo `ScoreManager` construido con ese `scoreStore`.
2. WHEN la aplicación se inicializa y `import.meta.env.VITE_SCORES_API_URL` es `undefined`, `null` o un string vacío (`""`), THE módulo `scoreManager.js` SHALL exportar un singleton `scoreStore` de tipo `LocalStorageScoreStore` y un singleton `scoreManager` de tipo `ScoreManager` construido con ese `scoreStore`.
3. THE `ScoreManager` SHALL operar sin cambios en su lógica interna (`recordScore`, `getLeaderboard`, `getBestScore`, `initialize`, `clear`) independientemente de si el store inyectado es `DynamoDBScoreStore` o `LocalStorageScoreStore`.
4. THE sistema SHALL leer el valor de `VITE_SCORES_API_URL` exclusivamente a través de `import.meta.env.VITE_SCORES_API_URL` (mecanismo de variables de entorno de Vite), sin acceder a `process.env` ni a ninguna otra fuente en tiempo de ejecución del navegador.

---

### Requirement 3: Infraestructura de la tabla DynamoDB

**User Story:** Como administrador del sistema, quiero una tabla DynamoDB con un índice secundario global optimizado, para poder consultar el top de scores globales en orden descendente de forma eficiente.

#### Acceptance Criteria

1. THE `Tabla_DynamoDB` SHALL existir en AWS con nombre `torre-nubes-scores`, clave primaria `id` de tipo String y modo de facturación on-demand.
2. THE `Tabla_DynamoDB` SHALL tener el `GSI` `gameId-score-index` con `gameId` (String) como clave de partición y `score` (Number) como clave de ordenación, con proyección de todos los atributos.
3. WHEN un `Score` es enviado al endpoint `POST /scores`, THE `Lambda` SHALL añadir el atributo `gameId` con el valor `"global"` al item antes de almacenarlo en la `Tabla_DynamoDB`; IF el body recibido incluye un campo `gameId` con valor distinto de `"global"`, THEN THE `Lambda` SHALL sobrescribirlo con `"global"`.
4. IF un item en la `Tabla_DynamoDB` no contiene el atributo `gameId`, THEN THE item NO SHALL aparecer en resultados del `GSI` `gameId-score-index`.
5. THE `GSI` SHALL permitir consultas de top scores ordenadas de mayor a menor por `score` cuando `ScanIndexForward` es `false`.

---

### Requirement 4: Endpoints de la función Lambda

**User Story:** Como frontend de la aplicación, quiero una API REST con endpoints bien definidos para leer, guardar y limpiar scores, para que `DynamoDBScoreStore` pueda comunicarse con DynamoDB sin lógica AWS en el cliente.

#### Acceptance Criteria

1. WHEN `Lambda` recibe una petición GET a `/scores`, THE `Lambda` SHALL consultar el `GSI` `gameId-score-index` con `gameId = "global"`, `ScanIndexForward = false` y `Limit = 10`, y retornar los items resultantes con código HTTP 200 y `Content-Type: application/json`.
2. WHEN `Lambda` recibe una petición POST a `/scores` con un body JSON que contiene `id` (String de 1 a 100 caracteres), `score` (número entero en el rango [0, 999999999]) y `timestamp` (String no vacío), THE `Lambda` SHALL persistir el item en la `Tabla_DynamoDB` añadiendo `gameId = "global"` y retornar el item guardado con código HTTP 201 y `Content-Type: application/json`.
3. IF `Lambda` recibe una petición POST a `/scores` con un body que omite o deja vacío el campo `id`, omite el campo `timestamp`, o incluye un `score` que no es un número entero en el rango [0, 999999999], THEN THE `Lambda` SHALL retornar código HTTP 400 con un cuerpo JSON que contiene el campo `error` describiendo el campo inválido.
4. WHEN `Lambda` recibe una petición DELETE a `/scores`, THE `Lambda` SHALL eliminar todos los items de la `Tabla_DynamoDB` que pertenezcan a `gameId = "global"` y retornar código HTTP 204 sin cuerpo.
5. WHEN `Lambda` recibe una petición OPTIONS a `/scores`, THE `Lambda` SHALL retornar código HTTP 204 con los headers `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods` y `Access-Control-Allow-Headers` para gestionar el preflight del navegador.
6. IF `Lambda` encuentra un error interno durante el procesamiento de cualquier petición, THEN THE `Lambda` SHALL registrar el error en CloudWatch y retornar código HTTP 500 con un cuerpo JSON que contiene el campo `error`.
7. THE `Lambda` SHALL ejecutarse en runtime Node.js 20.x con arquitectura arm64 y tener permisos IAM para las operaciones `dynamodb:PutItem`, `dynamodb:Query` y `dynamodb:DeleteItem` sobre el ARN de la `Tabla_DynamoDB`.

---

### Requirement 5: Configuración CORS del API Gateway y Lambda

**User Story:** Como jugador que accede al juego desde el `Dominio_Amplify`, quiero que las peticiones del navegador al `API_Gateway` sean aceptadas con los headers CORS correctos, para que el leaderboard funcione sin errores de política de origen.

#### Acceptance Criteria

1. THE `API_Gateway` SHALL tener CORS habilitado en el recurso `/scores` para los métodos GET, POST, DELETE y OPTIONS.
2. WHEN `Lambda` responde a cualquier petición (incluyendo respuestas 4xx, 5xx y OPTIONS), THE `Lambda` SHALL incluir el header `Access-Control-Allow-Origin` en la respuesta HTTP.
3. WHEN `Dominio_Amplify` ha sido asignado y configurado como origen permitido, THE `Lambda` SHALL establecer el header `Access-Control-Allow-Origin` al valor exacto del `Dominio_Amplify` en todas las respuestas.
4. WHEN `Dominio_Amplify` ha sido configurado y el header `Origin` de la petición entrante no coincide con el `Dominio_Amplify`, THE `Lambda` SHALL retornar código HTTP 403 o bien omitir el header `Access-Control-Allow-Origin` para que el navegador bloquee la respuesta.
5. THE `Lambda` SHALL incluir el header `Access-Control-Allow-Headers` con el valor `Content-Type` y el header `Access-Control-Allow-Methods` con los valores `GET,POST,DELETE,OPTIONS` en todas las respuestas.

---

### Requirement 6: Configuración del build y despliegue en Amplify Hosting

**User Story:** Como desarrollador, quiero que el repositorio GitHub esté conectado a Amplify Hosting con un pipeline de CI/CD automático, para que cada push a `main` despliegue la versión actualizada del juego sin intervención manual.

#### Acceptance Criteria

1. THE `Amplify_Hosting` SHALL estar conectado al repositorio GitHub del proyecto y configurado para escuchar la rama `main`.
2. WHEN se hace push a la rama `main`, THE `Amplify_Hosting` SHALL ejecutar automáticamente el pipeline de build sin intervención manual.
3. THE `amplify.yml` SHALL definir la fase `preBuild` con el comando `npm ci`, la fase `build` con el comando `npm run build`, y los artefactos de salida apuntando al directorio `dist/` con el patrón `**/*`.
4. THE `amplify.yml` SHALL declarar la caché del directorio `node_modules/**/*` en la sección `cache.paths`.
5. THE `Amplify_Hosting` SHALL tener la variable de entorno `VITE_SCORES_API_URL` configurada en el entorno de la rama `main`; IF `VITE_SCORES_API_URL` no está configurada cuando se ejecuta el pipeline, THEN THE pipeline SHALL fallar con un error antes de publicar el artefacto.
6. WHEN el pipeline de build finaliza con éxito, THE `Amplify_Hosting` SHALL publicar el contenido del directorio `dist/` bajo el `Dominio_Amplify` asignado.
7. IF el pipeline de build falla por cualquier causa, THEN THE `Amplify_Hosting` SHALL cancelar la publicación y preservar la versión desplegada anteriormente sin modificaciones.
8. THE archivo `.env.local` SHALL estar listado en `.gitignore` y NO SHALL ser incluido en el repositorio Git; la variable `VITE_SCORES_API_URL` SHALL ser gestionada exclusivamente a través de la interfaz de variables de entorno de `Amplify_Hosting` para el entorno de producción.

---

### Requirement 7: Consistencia del leaderboard global (propiedad de corrección)

**User Story:** Como jugador, quiero que mi score aparezca en el leaderboard global después de terminar una partida, para que mi resultado sea visible para todos los jugadores.

#### Acceptance Criteria

1. WHEN un `Score` válido es enviado mediante `DynamoDBScoreStore.save()` y la petición POST retorna código HTTP 201, THE `Tabla_DynamoDB` SHALL contener ese `Score` de modo que una petición GET subsecuente a `/scores` lo incluya en el resultado si está entre los 10 más altos.
2. WHEN `DynamoDBScoreStore.load()` es invocado y retorna un array con más de un elemento, THE array SHALL estar ordenado de forma que para todo par de elementos adyacentes `(a, b)` donde `a` precede a `b`, se cumpla `a.score >= b.score`.
3. FOR ALL scores válidos `s` guardados con `DynamoDBScoreStore.save([s])`, IF `s.score` se encuentra entre los 10 valores de `score` más altos almacenados en la `Tabla_DynamoDB`, THEN THE siguiente invocación de `DynamoDBScoreStore.load()` SHALL retornar un array que contiene un elemento con `id === s.id` (propiedad de round-trip: guardar → cargar → presencia).
4. WHEN `VITE_SCORES_API_URL` no está definida o es vacía y se inicializa el sistema, THE `ScoreManager` SHALL cargar y guardar scores en `localStorage` del dispositivo sin realizar peticiones HTTP, preservando el comportamiento original de `LocalStorageScoreStore`.

---

### Requirement 8: Entorno de desarrollo local sin dependencia del backend

**User Story:** Como desarrollador, quiero poder trabajar en el proyecto localmente sin configurar la infraestructura AWS, para que el flujo de desarrollo no dependa de tener acceso a la nube.

#### Acceptance Criteria

1. WHEN un desarrollador ejecuta `npm run dev` sin haber definido `VITE_SCORES_API_URL` en `.env.local`, THE sistema SHALL utilizar `LocalStorageScoreStore` y el juego SHALL funcionar completamente en local sin lanzar errores de consola relacionados al leaderboard remoto.
2. WHEN un desarrollador crea el archivo `.env.local` en la raíz del proyecto con la línea `VITE_SCORES_API_URL=<url>` y ejecuta `npm run dev`, THE sistema SHALL utilizar `DynamoDBScoreStore` configurado con `<url>` como URL base.
3. THE archivo `.env.local` SHALL estar listado en `.gitignore` del repositorio para evitar que URLs de entornos personales o credenciales sean commiteadas accidentalmente.
