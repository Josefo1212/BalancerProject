import express from 'express';
import cors from 'cors';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';
import { Balancer } from './balancer.js';

const app = express();

app.use(cors());
app.use(express.json());

const PORT_HTTP = 3000;

const PROTO_PATH = fileURLToPath(new URL('./ticket.proto', import.meta.url));

const listaIps = [
    '172.20.10.2:4000',     // Laptop Josefo (local)
    '172.20.10.3:4000', // Laptop de Laura
    '172.20.10.4:4000', // Laptop de LuisMi
];

const nombreNodoPorIp = {
    '172.20.10.2:4000': 'Laptop_Josefo',
    '172.20.10.3:4000': 'Laptop_Laura',
    '172.20.10.4:4000': 'Laptop_LuisMi',
};

const miBalanceador = new Balancer(listaIps);

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const ticketsProto = grpc.loadPackageDefinition(packageDefinition).tickets;

const GRPC_TIMEOUT_MS = 5000;
const MAX_REINTENTOS = 3;

// Pool de conexiones gRPC reutilizables para evitar crear un cliente nuevo por petición
const poolGrpc = {};

function obtenerClienteGrpc(nodoDestino) {
    if (!poolGrpc[nodoDestino]) {
        poolGrpc[nodoDestino] = new ticketsProto.TicketService(
            nodoDestino,
            grpc.credentials.createInsecure(),
            {
                'grpc.keepalive_time_ms': 10000,
                'grpc.keepalive_timeout_ms': 5000,
                'grpc.keepalive_permit_without_calls': 1,
            }
        );
    }
    return poolGrpc[nodoDestino];
}

app.post('/ticket', (req, res) => {
    const { cliente } = req.body;
    const nodosIntentados = new Set();

    const intentarEnviar = () => {
        const nodoDestino = miBalanceador.obtenerSiguienteNodo();

        if (!nodoDestino || nodosIntentados.has(nodoDestino)) {
            return res.status(503).json({
                ok: false,
                error: 'Todos los nodos gRPC están caídos o no disponibles.'
            });
        }

        nodosIntentados.add(nodoDestino);

        const tiempoInicio = performance.now();
        const nombreNodo = nombreNodoPorIp[nodoDestino] || nodoDestino;

        const clientGrpc = obtenerClienteGrpc(nodoDestino);
        const deadline = new Date(Date.now() + GRPC_TIMEOUT_MS);
        const metadata = new grpc.Metadata();
        metadata.set('node-name', nombreNodo);

        clientGrpc.GenerarTicket({ cliente: cliente || 'Anónimo' }, metadata, { deadline }, (error, response) => {
            const tiempoFin = performance.now();
            const latenciaActual = Math.round(tiempoFin - tiempoInicio);

            if (error) {
                console.error(`❌ Error gRPC: El nodo [${nodoDestino}] falló o está incomunicado. (${error.code}: ${error.message})`);

                miBalanceador.penalizarNodoPorFallo(nodoDestino);

                if (nodosIntentados.size < MAX_REINTENTOS) {
                    console.log(`🔄 Reintentando con otro nodo... (intento ${nodosIntentados.size + 1}/${MAX_REINTENTOS})`);
                    return intentarEnviar();
                }

                return res.status(502).json({
                    ok: false,
                    error: `El nodo distribuido (${nodoDestino}) experimentó un fallo de red.`
                });
            }

            // Extraer las tres métricas de telemetría del microservicio
            const cpuActual = response.usoCpu || 0;
            const ramActual = response.usoRam || 0;
            const procesosActuales = response.numProcesos || 0;

            // Actualizar el balanceador con la telemetría completa
            miBalanceador.actualizarMetricas(nodoDestino, latenciaActual, cpuActual, ramActual, procesosActuales);

            console.log(
                `[📡 Telemetría Wi-Fi] Redirigido a: ${nombreNodo} (${nodoDestino}) | ` +
                `Latencia: ${latenciaActual}ms | CPU: ${cpuActual}% | RAM: ${ramActual}% | Procesos: ${procesosActuales}`
            );

            res.json(response);
        });
    }

    intentarEnviar();
});

app.listen(PORT_HTTP, () => {
    console.log(`====================================================================`);
    console.log(`🚀 Gateway & API Server corriendo en http://localhost:${PORT_HTTP}`);
    console.log(`📡 Balanceador Load-Aware (Least Loaded) con telemetría de CPU, RAM y Procesos`);
    console.log(`🔗 Nodos configurados: ${listaIps.join(', ')}`);
    console.log(`====================================================================`);
});