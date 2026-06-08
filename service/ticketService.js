export class TicketServiceHandler {
    constructor(nodeName = 'Nodo_desconocido') {
        this.totalTickets = 0;
        this.nodeName = nodeName;
        this.generarTicket = this.generarTicket.bind(this);
    }

    generarTicket(call, callback) {
        this.totalTickets += 1;

        const nodeNameFromGateway = call.metadata?.get('node-name')?.[0];
        if (typeof nodeNameFromGateway === 'string' && nodeNameFromGateway.trim()) {
            this.nodeName = nodeNameFromGateway.trim();
        }

        const cliente = call.request?.cliente || 'desconocido';
        console.log(`[${this.nodeName}] ⚙️ Procesando petición de ${cliente}. Ticket emitido: #${this.totalTickets}`);

        callback(null, {
            ok: true,
            ticketNumero: this.totalTickets,
            procesadoPor: this.nodeName,
            mensaje: `Ticket generado exitosamente en el nodo gRPC: ${this.nodeName}`,
            usoCpu: 0,
        });
    }
}