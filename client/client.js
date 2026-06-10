const GATEWAY_URL = 'http://localhost:3000/ticket';
const TOTAL_RAFAGA = 1000;

const btnGenerar = document.getElementById('btnGenerar');
const totalRequestsSpan = document.getElementById('totalRequests');
const lastNodeSpan = document.getElementById('lastNode');
const logTerminal = document.getElementById('logTerminal');
const contadorExitosasSpan = document.getElementById('contadorExitosas');
const contadorFallidasSpan = document.getElementById('contadorFallidas');

let contadorPeticiones = 0;
let exitosas = 0;
let fallidas = 0;

const agregarLog = (mensaje, tipo = 'info') => {
    const linea = document.createElement('div');
    linea.className = `log-line ${tipo}`;

    const ahora = new Date().toLocaleTimeString();
    linea.textContent = `[${ahora}] ${mensaje}`;

    logTerminal.appendChild(linea);
    logTerminal.scrollTop = logTerminal.scrollHeight;
};

/**
 * Envía una sola petición HTTP POST al gateway y retorna una promesa
 * que se resuelve con el resultado (éxito o error manejado).
 */
const enviarPeticion = async (indice) => {
    const tiempoInicio = performance.now();

    try {
        const respuesta = await fetch(GATEWAY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cliente: `Cliente-Rafaga-${indice}` }),
        });

        const latencia = Math.round(performance.now() - tiempoInicio);

        if (!respuesta.ok) {
            const errorTexto = await respuesta.text();
            fallidas++;
            contadorFallidasSpan.textContent = fallidas;
            agregarLog(
                `❌ [#${indice}] HTTP ${respuesta.status} | ${latencia}ms | ${errorTexto}`,
                'error'
            );
            return;
        }

        const datos = await respuesta.json();
        const nodo = datos.procesadoPor || 'Desconocido';
        const cpu = datos.usoCpu ?? '-';
        const ram = datos.usoRam ?? '-';
        const proc = datos.numProcesos ?? '-';

        exitosas++;
        contadorExitosasSpan.textContent = exitosas;
        lastNodeSpan.textContent = nodo;

        agregarLog(
            `✅ [#${indice}] ${latencia}ms | Ticket #${datos.ticketNumero} | ` +
            `${nodo} (CPU: ${cpu}% | RAM: ${ram}% | Proc: ${proc})`,
            'success'
        );
    } catch (error) {
        fallidas++;
        contadorFallidasSpan.textContent = fallidas;
        agregarLog(
            `❌ [#${indice}] Error de red: ${error.message}`,
            'error'
        );
    }
};

/**
 * Dispara una ráfaga masiva de 1,000 peticiones concurrentes al clúster.
 */
const dispararRafaga = async () => {
    // 1. Deshabilitar el botón inmediatamente
    btnGenerar.disabled = true;
    btnGenerar.textContent = `⏳ Enviando ${TOTAL_RAFAGA} peticiones...`;

    // Reiniciar contadores de la ráfaga
    exitosas = 0;
    fallidas = 0;
    contadorExitosasSpan.textContent = '0';
    contadorFallidasSpan.textContent = '0';

    agregarLog(`🚀 ═══════ INICIO DE RÁFAGA MASIVA: ${TOTAL_RAFAGA} peticiones concurrentes ═══════`, 'system');

    const tiempoInicioTotal = performance.now();

    // 2. Crear un array de promesas SIN await dentro del ciclo → paralelismo real
    const promesas = [];
    for (let i = 1; i <= TOTAL_RAFAGA; i++) {
        contadorPeticiones++;
        totalRequestsSpan.textContent = contadorPeticiones;
        promesas.push(enviarPeticion(i));
    }

    // 3. Esperar a que TODAS las 1,000 peticiones finalicen
    await Promise.all(promesas);

    // 4. Log de resumen final
    const tiempoTotal = Math.round(performance.now() - tiempoInicioTotal);

    agregarLog(
        `🏁 ═══════ RÁFAGA COMPLETADA ═══════ ` +
        `Tiempo total: ${tiempoTotal}ms | ` +
        `Exitosas: ${exitosas} | Fallidas: ${fallidas} | ` +
        `Total: ${TOTAL_RAFAGA}`,
        'system'
    );

    // 5. Rehabilitar el botón
    btnGenerar.disabled = false;
    btnGenerar.textContent = `🔥 Lanzar Ráfaga (${TOTAL_RAFAGA} peticiones)`;
};

btnGenerar.addEventListener('click', dispararRafaga);