const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// 1. Cargar el contrato .proto
const PROTO_PATH = path.join(__dirname, 'tickets.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

// Asumimos que el package en el .proto se llama 'tickets'
const ticketsProto = grpc.loadPackageDefinition(packageDefinition).tickets;

// 2. Contador en memoria RAM (se reiniciará si apagas el servidor)
let totalTickets = 0;

// 3. Lógica principal del servicio (GenerarTicket)
function generarTicket(call, callback) {
    // Incrementar el contador con cada llamada
    totalTickets++;
    
    // Leer la variable de entorno o usar un valor por defecto
    const nodeName = process.env.NODE_NAME || 'Laptop_LuisMi';
    
    console.log(`[${nodeName}] ⚙️ Procesando petición. Ticket emitido: #${totalTickets}`);

    // Construir la respuesta binaria estructurada según el contrato
    const response = {
        ok: true,
        numero: totalTickets,
        procesadoPor: nodeName,
        mensaje: `Ticket generado exitosamente en el nodo gRPC: ${nodeName}`
    };

    // Devolver la respuesta (null es el espacio para el error, que aquí no hay)
    callback(null, response);
}

// 4. Inicialización del servidor de alto rendimiento
function main() {
    const server = new grpc.Server();
    
    // Conectar el servicio definido en el .proto con la función de JS
    // Asumimos que el servicio se llama 'TicketService' en el .proto
    server.addService(ticketsProto.TicketService.service, {
        GenerarTicket: generarTicket
    });

    const HOST = '0.0.0.0:4000'; // Escuchando en el puerto 4000
    
    server.bindAsync(HOST, grpc.ServerCredentials.createInsecure(), (error, port) => {
        if (error) {
            console.error('❌ Error al levantar el servidor gRPC:', error);
            return;
        }
        console.log(`🚀 Microservicio gRPC de Tickets corriendo en ${HOST}`);
        console.log(`💻 Nodo registrado como: ${process.env.NODE_NAME || 'Laptop_LuisMi'}`);
    });
}

main();