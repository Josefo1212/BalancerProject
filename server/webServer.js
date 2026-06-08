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
    '10.147.253.177:4000',     // Laptop Josefo (local)
    '10.147.253.32:4000', // Laptop de Laura
    '10.147.253.244:4000', // Laptop de LuisMi
];

const nombreNodoPorIp = {
    '10.147.253.177:4000': 'Laptop_Josefo',
    '10.147.253.32:4000': 'Laptop_Laura',
    '10.147.253.244:4000': 'Laptop_LuisMi',
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

        const clientGrpc = new ticketsProto.TicketService(nodoDestino, grpc.credentials.createInsecure());
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

            const cpuActual = response.usoCpu || 0;

            miBalanceador.actualizarMetricas(nodoDestino, latenciaActual, cpuActual);

            console.log(`[📡 Telemetría Wi-Fi] Redirigido a: ${nodoDestino} | Latencia: ${latenciaActual}ms | CPU: ${cpuActual}%`);

            res.json(response);
        });
    }

    intentarEnviar();
});

app.listen(PORT_HTTP, () => {
    console.log(`====================================================================`);
    console.log(`🚀 Gateway & API Server corriendo en http://localhost:${PORT_HTTP}`);
    console.log(`📡 Orquestando clúster gRPC mediante lista de IPs estática`);
    console.log(`====================================================================`);
});