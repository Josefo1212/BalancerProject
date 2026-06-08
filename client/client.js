import { performance } from 'perf_hooks';

const GATEWAY_URL = 'http://localhost:3000/ticket';
const CONCURRENT_REQUESTS = 20;

/**
 * Envía una solicitud HTTP POST al gateway Express para registrar un ticket.
 * @param {number} id - Identificador de la petición.
 */
async function enviarPeticion(id) {
    const tiempoInicio = performance.now();
    try {
        const respuesta = await fetch(GATEWAY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ cliente: `Laura-Cliente-Concurrente-${id}` })
        });
        const latenciaClient = Math.round(performance.now() - tiempoInicio);

        if (!respuesta.ok) {
            const errorTexto = await respuesta.text();
            return {
                id,
                ok: false,
                status: respuesta.status,
                error: errorTexto,
                latenciaClient
            };
        }

        const datos = await respuesta.json();
        return {
            id,
            ok: true,
            datos,
            latenciaClient
        };
    } catch (error) {
        const latenciaClient = Math.round(performance.now() - tiempoInicio);
        return {
            id,
            ok: false,
            error: error.message,
            latenciaClient
        };
    }
}

/**
 * Lanza la ráfaga de peticiones concurrentes y resume los resultados.
 */
async function lanzarRafaga() {
    console.log(`================================================================`);
    console.log(`🚀 Iniciando ráfaga concurrente de ${CONCURRENT_REQUESTS} peticiones HTTP a ${GATEWAY_URL}`);
    console.log(`================================================================\n`);

    const tiempoInicioTotal = performance.now();

    // Disparar solicitudes concurrentemente usando Promise.all()
    const promesas = Array.from({ length: CONCURRENT_REQUESTS }, (_, i) => enviarPeticion(i + 1));
    const resultados = await Promise.all(promesas);

    const tiempoFinTotal = performance.now();
    const duracionTotal = Math.round(tiempoFinTotal - tiempoInicioTotal);

    let exitosas = 0;
    let fallidas = 0;
    const distribucionNodos = {};

    resultados.forEach((res) => {
        if (res.ok) {
            exitosas++;
            const nodo = res.datos.procesadoPor || 'Desconocido';
            distribucionNodos[nodo] = (distribucionNodos[nodo] || 0) + 1;

            console.log(`✅ [Petición #${String(res.id).padStart(2, '0')}] HTTP 200 | Latencia Cliente: ${res.latenciaClient}ms | Ticket #${res.datos.ticketNumero} | Procesado por: ${nodo}`);
        } else {
            fallidas++;
            console.error(`❌ [Petición #${String(res.id).padStart(2, '0')}] FALLÓ | Latencia Cliente: ${res.latenciaClient}ms | Error: ${res.error}`);
        }
    });

    console.log(`\n================================================================`);
    console.log(`📊 RESUMEN DE LA DEFENSAS - PRUEBA CONCURRENTE`);
    console.log(`================================================================`);
    console.log(`⏱️  Tiempo total de ráfaga:   ${duracionTotal} ms`);
    console.log(`📈 Peticiones Exitosas:       ${exitosas}/${CONCURRENT_REQUESTS}`);
    console.log(`📉 Peticiones Fallidas:       ${fallidas}/${CONCURRENT_REQUESTS}`);
    console.log(`⚖️  Distribución de Carga:`);
    Object.entries(distribucionNodos).forEach(([nodo, conteo]) => {
        const porcentaje = Math.round((conteo / exitosas) * 100);
        console.log(`   - Nodo [${nodo}]: ${conteo} tickets (${porcentaje}%)`);
    });
    console.log(`================================================================`);
}

lanzarRafaga();
