import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';
import { TicketServiceHandler } from './ticketService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROTO_PATH = path.join(__dirname, 'ticket.proto');

const main = () => {
    const ticketService = new TicketServiceHandler();
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
    });

    const ticketsProto = grpc.loadPackageDefinition(packageDefinition).tickets;
    const server = new grpc.Server();

    server.addService(ticketsProto.TicketService.service, {
        GenerarTicket: ticketService.generarTicket
    });

    const HOST = '0.0.0.0:4000';
    
    server.bindAsync(HOST, grpc.ServerCredentials.createInsecure(), (error, port) => {
        if (error) {
            console.error('❌ Error al levantar el servidor gRPC:', error);
            return;
        }
        console.log(`🚀 Microservicio gRPC de Tickets corriendo en ${HOST}`);
        console.log(`💻 Nodo registrado como: ${process.env.NODE_NAME || 'Laptop_LuisMi'}`);
    });
};

if (process.argv[1] === __filename) {
    main();
}