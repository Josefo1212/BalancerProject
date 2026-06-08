# Guía de Benchmarking con Autocannon - Capa Cliente (Laura)

Este documento detalla la configuración y comandos necesarios para realizar pruebas de estrés sobre la arquitectura distribuida del grupo. Utilizaremos **Autocannon**, una herramienta de benchmarking HTTP de alto rendimiento escrita en Node.js, para estresar el Express Gateway de Josefo y verificar cómo el balanceador distribuye las peticiones hacia los microservicios gRPC.

---

## 🛠️ Instalación de Autocannon

Puedes ejecutar Autocannon directamente usando `npx` o instalarlo de forma global en tu máquina:

### Opción A (Recomendada - Sin instalación global)
```bash
npx autocannon [parámetros]
```

### Opción B (Instalación global)
```bash
npm install -g autocannon
```

---

## 🏎️ Comandos de Prueba de Estrés

Hemos configurado un script directo en el `package.json` de la raíz del proyecto. Para lanzarlo, asegúrate de que el Gateway de Josefo está corriendo en el puerto `3000` y ejecuta:

```bash
npm run benchmark
```

### El Comando Bajo el Capó
Si quieres correrlo manualmente o ajustar los parámetros, este es el comando configurado:

```bash
autocannon -c 100 -d 10 -p 10 -m POST -b "{\"cliente\":\"Autocannon-Stress\"}" -H "Content-Type: application/json" http://localhost:3000/ticket
```

### Explicación de los Parámetros:
* `-c 100` (`--connections`): Abre **100 conexiones concurrentes** simultáneas contra el servidor.
* `-d 10` (`--duration`): La prueba se ejecutará durante **10 segundos**.
* `-p 10` (`--pipelining`): Envía **10 solicitudes por tubería (pipeline)** por cada conexión abierta antes de esperar la respuesta, maximizando la concurrencia.
* `-m POST` (`--method`): Define el método HTTP como `POST` para golpear el endpoint `/ticket`.
* `-b "..."` (`--body`): Define el cuerpo JSON que espera nuestro Express Gateway (`{ "cliente": "Autocannon-Stress" }`).
* `-H "..."` (`--headers`): Cabecera `Content-Type: application/json` necesaria para que Express parsee el JSON.

---

## 📊 Métricas Clave a Defender

Cuando finalice la ejecución de Autocannon, verás una tabla similar a esta en tu consola:

```text
┌─────────┬──────┬──────┬───────┬───────┬─────────┬─────────┬────────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%   │ Avg     │ Stdev   │ Max    │
├─────────┼──────┼──────┼───────┼───────┼─────────┼─────────┼────────┤
│ Latency │ 5 ms │ 8 ms │ 25 ms │ 40 ms │ 10.2 ms │ 6.4 ms  │ 120 ms │
└─────────┴──────┴──────┴───────┴───────┴─────────┴─────────┴────────┘
┌──────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│ Stat     │ 1%      │ 2.5%    │ 50%     │ 97.5%   │ Avg     │ Min     │ Max     │
├──────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Req/Sec  │ 12000   │ 12000   │ 14500   │ 16000   │ 14200   │ 12000   │ 16500   │
├──────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ Bytes/Sec│ 2.4 MB  │ 2.4 MB  │ 2.9 MB  │ 3.2 MB  │ 2.84 MB │ 2.4 MB  │ 3.3 MB  │
└──────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
```

Debes enfocarte en reportar al profesor:
1. **Req/Sec (Peticiones por Segundo / RPS):** Cuántas peticiones HTTP de promedio fue capaz de digerir el Gateway de Josefo y redirigir a gRPC.
2. **Latency (Latencia):** El promedio y percentiles (97.5%, 99%). Esto demuestra la estabilidad del sistema bajo carga.
3. **Distribución del Balanceador:** Observa cómo las CPU de las laptops del grupo cambian dinámicamente y el balanceador de Josefo ajusta la distribución basándose en las métricas en tiempo real de `balancer.js`.
