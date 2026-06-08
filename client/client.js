const GATEWAY_URL = 'http://localhost:3000/ticket';

const btnGenerar = document.getElementById('btnGenerar');
const totalRequestsSpan = document.getElementById('totalRequests');
const lastNodeSpan = document.getElementById('lastNode');
const logTerminal = document.getElementById('logTerminal');

let contadorPeticiones = 0;

const agregarLog = (mensaje, tipo = 'info') => {
    const linea = document.createElement('div');
    linea.className = `log-line ${tipo}`;

    const ahora = new Date().toLocaleTimeString();
    linea.textContent = `[${ahora}] ${mensaje}`;

    logTerminal.appendChild(linea);
    logTerminal.scrollTop = logTerminal.scrollHeight;
}

const solicitarTicket = async () => {
    contadorPeticiones++;
    totalRequestsSpan.textContent = contadorPeticiones;

    const idActual = contadorPeticiones;
    const tiempoInicio = performance.now();

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

        lastNodeSpan.textContent = nodo;

        agregarLog(`✅ [Petición #${idActual}] HTTP 200 | Latencia: ${latenciaClient}ms | Ticket #${datos.ticketNumero} | Nodo: ${nodo} (CPU: ${datos.usoCpu}%)`, 'success');

    } catch (error) {
        agregarLog(`❌ [Petición #${idActual}] Error de red / Gateway apagado: ${error.message}`, 'error');
    } finally {
        btnGenerar.disabled = false;
    }
}

btnGenerar.addEventListener('click', solicitarTicket);