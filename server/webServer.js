// server/webServer.js
import express from 'express';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';
import { obtenerSiguienteNodo, actualizarMetricas } from './balancer.js'; 
const app = express();
app.use(express.json());

const PORT_HTTP = 3000;

// 🛠️ Configuración moderna para emular __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROTO_PATH = path.join(__dirname, 'tickets.proto');

// 📦 Cargar el contrato binario
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true, longs: String, enums: String, defaults: true, oneofs: true
});
const ticketsProto = grpc.loadPackageDefinition(packageDefinition).tickets;

// 🧠 Endpoint Gateway
app.post('/ticket', (req, res) => {
    const { cliente } = req.body;
    const nodoDestino = obtenerSiguienteNodo();
    
    if (!nodoDestino) {
        return res.status(500).json({ error: 'No hay nodos gRPC disponibles en la red.' });
    }

    // Cronometramos el comportamiento del Wi-Fi de tu teléfono
    const tiempoInicio = performance.now();
    const clientGrpc = new ticketsProto.TicketService(nodoDestino, grpc.credentials.createInsecure());

    clientGrpc.GenerarTicket({ cliente: cliente || 'Anónimo' }, (error, response) => {
        const tiempoFin = performance.now();
        const latenciaActual = Math.round(tiempoFin - tiempoInicio);

        if (error) {
            console.error(`❌ El nodo ${nodoDestino} falló la llamada RPC. Aplicando penalización.`);
            actualizarMetricas(nodoDestino, 999, 99); // Lo sacamos del juego temporalmente
            return res.status(502).json({ error: 'El nodo distribuido no respondió.' });
        }
        
        const cpuActual = response.usoCpu || 0;
        
        // Retroalimentación al balanceador inteligente
        actualizarMetricas(nodoDestino, latenciaActual, cpuActual);

        console.log(`[📡 Telemetría Wi-Fi] Nodo: ${nodoDestino} | Latencia: ${latenciaActual}ms | CPU: ${cpuActual}%`);
        
        res.json(response);
    });
});

app.listen(PORT_HTTP, () => {
    console.log(`================================================================`);
    console.log(`🚀 Gateway ESM Moderno corriendo en http://localhost:${PORT_HTTP}`);
    console.log(`📡 Monitoreando recursos y latencia en el Hotspot móvil...`);
    console.log(`================================================================`);
});