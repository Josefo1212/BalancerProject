// Registro dinámico de los nodos con sus métricas en tiempo real
const nodos = {
    '192.168.1.15:4000': { nombre: 'Laura', latencia: 10, cpu: 10 },
    '192.168.1.20:4000': { nombre: 'LuisMi', latencia: 10, cpu: 10 },
    'localhost:4000':     { nombre: 'Josefo', latencia: 5, cpu: 10 }
};

/**
 * Elige el mejor nodo basado en el menor costo (Latencia Wi-Fi + CPU)
 * @returns {string|null} IP:PUERTO del nodo ganador
 */
export const obtenerSiguienteNodo = () => {
    const listaIps = Object.keys(nodos);
    if (listaIps.length === 0) return null;

    let mejorNodo = listaIps[0];
    let menorCosto = Infinity;

    listaIps.forEach(ip => {
        const info = nodos[ip];
        // Fórmulita adaptativa: penaliza el lag del Hotspot y la fatiga del procesador
        const costo = (info.latencia * 1.5) + info.cpu;

        if (costo < menorCosto) {
            menorCosto = costo;
            mejorNodo = ip;
        }
    });

    return mejorNodo;
}

/**
 * Actualiza la telemetría devuelta por gRPC
 */
export const actualizarMetricas = (ip, nuevaLatencia, nuevoCpu) => {
    if (nodos[ip]) {
        nodos[ip].latencia = nuevaLatencia;
        nodos[ip].cpu = nuevoCpu;
    }
}