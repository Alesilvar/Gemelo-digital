# Gemelo digital del aula L419

Aplicación propia en React + TypeScript + Vite. Recibe JSON de sensores mediante MQTT.js sobre WebSocket seguro. No incluye backend, base de datos, credenciales ni publicación MQTT.

## Iniciar

Requisito: Node.js 22.12 o posterior (también compatible con Node.js 24) y npm.

Desde la raíz del proyecto:

```bash
cd web
npm ci
npm run dev
```

Abrir la URL local indicada por Vite, normalmente `http://127.0.0.1:5173/`. Detener con `Ctrl+C`. El servidor escucha únicamente en la interfaz local.

Para compilar y previsualizar la versión estática:

```bash
npm run build
npm run preview
```

`npm run build` verifica TypeScript y genera `dist/`. No ejecuta pruebas automáticas. No se han agregado pruebas ni un ejecutor de pruebas.

## Broker y tópico

Los valores predeterminados están centralizados en `src/config.ts`:

```text
broker: wss://test.mosquitto.org:8081
tópico: utec/gemelo/grupo4_pitufo/#
```

Se pueden sustituir mediante un archivo `web/.env.local` (ignorado por Git), siguiendo `.env.example`:

```dotenv
VITE_MQTT_BROKER=wss://test.mosquitto.org:8081
VITE_MQTT_TOPIC=utec/gemelo/grupo4_pitufo/#
```

Reiniciar Vite después de cambiar las variables; para una compilación estática, volver a compilar. La URL debe usar `wss://`. No se admiten credenciales en la URL. No colocar secretos en variables `VITE_*`: se incluyen en el código del navegador ([documentación de Vite](https://vite.dev/guide/env-and-mode)).

La guía propone un broker **público**. Los tópicos no son privados y cualquiera puede leer o enviar mensajes al grupo. No enviar información sensible. Los payloads recibidos no están autenticados; la interfaz los muestra como datos recibidos, no como información verificada.

## Uso

- **Vista general:** últimas mediciones, estado comunicado por el gateway y gráfico seleccionable por sensor, medición y ventana temporal. Las tarjetas abren el inspector aunque todavía no haya datos.
- **Gráfico:** corresponde exclusivamente a mensajes recibidos durante la sesión; eje horizontal por hora de recepción del navegador. Muestra hasta los últimos 300 mensajes del sensor dentro de la ventana elegida. El control deslizante permite recorrerlos con teclado y abrir su JSON. Los valores ausentes dejan huecos. No se promedian ni se interpolan lecturas ausentes.
- **Inspector:** campos originales, unidades del contrato, tópico, nodo, secuencia, hora del gateway, hora de recepción, anomalías recibidas y contenido original exacto. Las flechas recorren mensajes conservados del sensor; “Último” vuelve al seguimiento de su última recepción.
- **Mensajes de sesión:** filtros por sensor, por anomalía recibida y por errores; tabla paginada con los mensajes más recientes primero.
- **Nodos y conexión:** broker, filtro de suscripción, última recepción por sensor, secuencia y pérdidas comunicadas por el dispositivo. El tiempo transcurrido no genera nuevas anomalías ni determina un estado del aula.
- **Por definir:** plano, zonas, límites de alerta y recomendaciones aparecen como **Pendiente de definir**.

Los controles nativos, botones y diálogo funcionan con teclado. El diálogo conserva el foco dentro de él, se cierra con `Escape` o con “Cerrar detalle” y devuelve el foco al control que lo abrió.

## Sesión y límites

Los datos viven solo en memoria. Se pierden al cerrar o recargar la página; no se usa localStorage, IndexedDB ni un servicio de almacenamiento. Se conservan hasta **5.000 mensajes recientes** y se mantienen las últimas lecturas por tópico para la vista actual; al superar el límite se descartan los mensajes más antiguos del explorador. Los contadores corresponden al total recibido desde la apertura. Una desconexión voluntaria o un reintento conservan la sesión abierta.

Si el broker entrega un mensaje retenido, se identifica como tal en el inspector y el registro. Su contenido puede ser anterior a la apertura de la web: la hora de recepción no es la hora de medición. Esto no constituye un historial persistente.

## Recepción MQTT

- Un cliente por montaje, identificador aleatorio, sesión MQTT limpia, QoS 0 y reconexión cada 5 segundos.
- Suscripción explícita una vez por conexión; `resubscribe: false` evita la resuscripción adicional de MQTT.js. Se marca “Conectado” solo después de que el broker acepte la suscripción.
- Al desmontar se eliminan los listeners y se cierra el cliente; funciona con el ciclo de montaje y limpieza de React StrictMode.
- La aplicación no llama a `publish`, no configura mensajes de última voluntad y no cambia firmware, servidores ni archivos de Grafana. Los paquetes del protocolo de conexión/suscripción y mantenimiento son necesarios para leer MQTT.
- `gateway/estado` se procesa como texto plano. Su estado es independiente del enlace MQTT del navegador.
- Los sensores deben enviar objetos JSON con `tipo` coincidente con el último segmento del tópico. JSON malformado, valores que no son objetos y discrepancias de tipo quedan registrados con error y contenido original; no sustituyen una lectura válida anterior.
- `null` no se convierte en cero. Los números `0/1` se conservan; para la puerta se muestra también la equivalencia cerrada/abierta definida en el contrato.
- Con `ts: null` se indica “Sin hora sincronizada”; siempre se conserva por separado la hora de llegada del navegador.
- Los códigos CO₂ `-1` y `-2` se conservan en el inspector con su significado de diagnóstico y no se grafican como concentración.
- Solo se muestran anomalías del campo `anomalias`. No se calculan umbrales, clasificaciones del aula, causas, consecuencias ni recomendaciones. Los valores de `nivel`, si llegan, se muestran únicamente como campos recibidos.
- Fallos de conexión o suscripción se informan; después de 30 s sin mensajes se avisa de la falta de nuevas recepciones sin declarar un nodo caído.

El comportamiento de conexión y resuscripción sigue la [documentación de MQTT.js](https://github.com/mqttjs/MQTT.js).

## Referencias consultadas

Se inspeccionó la estructura local y no existía una aplicación web ni se encontraron archivos AGENTS.md adicionales. Se siguieron las instrucciones AGENTS.md incluidas en el chat.

Se leyeron antes de editar:

- `../documentos_analizados/contrato_datos_mqtt.md`.
- `../documentos_analizados/GUIA_PRUEBA.md`.
- `../documentos_analizados/ejemplos_mqtt.json` (referencia de formato; no se cargan como datos en la aplicación).
- [Dashboard Grafana de siete sensores](https://drive.google.com/file/d/1tLW-syzJFY_dUCO3AVNFs7dYW3u-Z-HW/view): JSON completo, secciones, nombres, campos y unidades. El archivo se llama L419, pero su título interno dice L418; se usó L419 por instrucción del proyecto. La demo conserva las agrupaciones de ocupación y puerta, calidad del aire, confort térmico, acústica e iluminación; no adopta sus umbrales ni consulta sus series de InfluxDB.
- [Carpeta de código compartido](https://drive.google.com/drive/folders/1tf4S0765deHpeeRLdqpPgcSakwKKSSzv): se listó su estructura y las carpetas `gateway` y `servidor_iot`; se leyó `gateway/paquetes.h` para contrastar campos y diagnósticos. No se revisó todo el firmware ni se descargó o modificó la configuración del servidor.

## Archivos de la implementación

- `package.json`, `package-lock.json`: dependencias y comandos.
- `index.html`, `vite.config.ts`, `tsconfig.json`, `.gitignore`, `.env.example`: arranque y configuración.
- `src/main.tsx`, `src/vite-env.d.ts`: entrada y tipos de entorno.
- `src/config.ts`: valores configurables y validación.
- `src/data.ts`: catálogo de sensores, unidades y parser.
- `src/useMqtt.ts`: conexión y memoria de sesión.
- `src/App.tsx`: dashboard, filtros, registro, nodos y pendientes.
- `src/Chart.tsx`: gráfico de sesión con explorador accesible.
- `src/Detail.tsx`: inspector de mensajes.
- `src/styles.css`: diseño adaptable.

Los documentos y diagramas originales se conservan sin cambios.

## Verificación realizada

El 13 de noviembre de 2026 (hora de Lima):

- Dependencias instaladas localmente mediante npm, sin sudo.
- `npm run build` completado: comprobación de tipos y compilación estática.
- El servidor Vite respondió HTTP 200 y la web se abrió en el navegador integrado con un ancho estrecho.
- Revisión manual del estado vacío, el explorador de mensajes, la apertura del inspector de luz y su cierre mediante `Escape`, con retorno del foco a la tarjeta.
- Se intentó la conexión real a `wss://test.mosquitto.org:8081`; MQTT.js informó `connack timeout` y la interfaz mostró desconexión/reconexión. **No se confirmó una conexión exitosa ni se recibieron mensajes.** No se atribuye una causa específica al fallo sin evidencia adicional.
- No se publicaron mensajes ni se inyectaron datos de ejemplo en la interfaz. El procesamiento de mensajes reales, los gráficos poblados y la recuperación tras una reconexión exitosa quedan pendientes de comprobar con un broker accesible y un emisor activo.
- No se agregaron ni ejecutaron pruebas automáticas.
