export class TicketServiceHandler {
    constructor() {
        this.totalTickets = 0;
        this.nodeName ='Laptop_Josefo';
        this.generarTicket = this.generarTicket.bind(this);
    }

    generarTicket(call, callback) {
        this.totalTickets += 1;

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