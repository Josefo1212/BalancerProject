const GATEWAY_URL = 'http://localhost:3000/ticket';

const btnGenerar = document.getElementById('btnGenerar');
const totalRequestsSpan = document.getElementById('totalRequests');
const lastNodeSpan = document.getElementById('lastNode');
const logTerminal = document.getElementById('logTerminal');

let contadorPeticiones = 0;

/**
 * Inserta una línea de historial en la mini-terminal de la interfaz
 */
function agregarLog(mensaje, tipo = 'info') {
    const linea = document.createElement('div');
    linea.className = `log-line ${tipo}`;

    const ahora = new Date().toLocaleTimeString();
    linea.textContent = `[${ahora}] ${mensaje}`;

    logTerminal.appendChild(linea);
    logTerminal.scrollTop = logTerminal.scrollHeight; // Auto-scroll al final
}

/**
 * Envía una ÚNICA solicitud al presionar el botón
 */
async function solicitarTicket() {
    contadorPeticiones++;
    totalRequestsSpan.textContent = contadorPeticiones;

    const idActual = contadorPeticiones;
    const tiempoInicio = performance.now(); // Usando el performance nativo del navegador

    // Deshabilitar temporalmente para evitar spam en el mismo milisegundo
    btnGenerar.disabled = true;
    agregarLog(`🚀 Enviando petición #${idActual} al balanceador...`, 'info');

    try {
        const respuesta = await fetch(GATEWAY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ cliente: `Laura-Cliente-Web-${idActual}` })
        });

        const latenciaClient = Math.round(performance.now() - tiempoInicio);
        if (!respuesta.ok) {
            const errorTexto = await respuesta.text();
            agregarLog(`❌ [Petición #${idActual}] Error HTTP ${respuesta.status}: ${errorTexto}`, 'error');
            return;
        }

        const datos = await respuesta.json();
        const nodo = datos.procesadoPor || 'Desconocido';

        // Actualizamos las tarjetas de estadísticas en la pantalla
        lastNodeSpan.textContent = nodo;

        // Imprimimos los resultados en el historial estético
        agregarLog(`✅ [Petición #${idActual}] HTTP 200 | Latencia: ${latenciaClient}ms | Ticket #${datos.ticketNumero} | Nodo: ${nodo} (CPU: ${datos.usoCpu}%)`, 'success');

    } catch (error) {
        agregarLog(`❌ [Petición #${idActual}] Error de red / Gateway apagado: ${error.message}`, 'error');
    } finally {
        // Habilitar el botón otra vez para el siguiente clic
        btnGenerar.disabled = false;
    }
}

// Asignar la función al clic del botón del HTML
btnGenerar.addEventListener('click', solicitarTicket);