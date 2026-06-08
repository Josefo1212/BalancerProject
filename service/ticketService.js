import os from 'os';

export class TicketServiceHandler {
    constructor(nodeName = 'Nodo_desconocido') {
        this.totalTickets = 0;
        this.nodeName = nodeName;
        this.generarTicket = this.generarTicket.bind(this);
    }

    obtenerMuestraCpu() {
        const cpus = os.cpus();

        return cpus.map((cpu) => {
            const { user, nice, sys, idle, irq } = cpu.times;

            return {
                idle,
                total: user + nice + sys + idle + irq,
            };
        });
    }

    calcularUsoCpu(muestraAnterior, muestraActual) {
        let idleDeltaTotal = 0;
        let totalDeltaTotal = 0;

        for (let indice = 0; indice < muestraActual.length; indice += 1) {
            const muestraCpuAnterior = muestraAnterior[indice];
            const muestraCpuActual = muestraActual[indice];

            idleDeltaTotal += muestraCpuActual.idle - muestraCpuAnterior.idle;
            totalDeltaTotal += muestraCpuActual.total - muestraCpuAnterior.total;
        }

        if (totalDeltaTotal <= 0) {
            return 0;
        }

        const usoCpu = 100 * (1 - idleDeltaTotal / totalDeltaTotal);
        return Math.max(0, Math.min(100, Math.round(usoCpu)));
    }

    medirUsoCpuReal() {
        return new Promise((resolve) => {
            const muestraAnterior = this.obtenerMuestraCpu();

            setTimeout(() => {
                const muestraActual = this.obtenerMuestraCpu();
                resolve(this.calcularUsoCpu(muestraAnterior, muestraActual));
            }, 200);
        });
    }

    async generarTicket(call, callback) {
        this.totalTickets += 1;

        const nodeNameFromGateway = call.metadata?.get('node-name')?.[0];
        if (typeof nodeNameFromGateway === 'string' && nodeNameFromGateway.trim()) {
            this.nodeName = nodeNameFromGateway.trim();
        }

        try {
            const usoCpu = await this.medirUsoCpuReal();
            const cliente = call.request?.cliente || 'desconocido';

            console.log(`[${this.nodeName}] ⚙️ Procesando petición de ${cliente}. Ticket emitido: #${this.totalTickets} | CPU: ${usoCpu}%`);

            callback(null, {
                ok: true,
                ticketNumero: this.totalTickets,
                procesadoPor: this.nodeName,
                mensaje: `Ticket generado exitosamente en el nodo gRPC: ${this.nodeName}`,
                usoCpu,
            });
        } catch (error) {
            callback(error);
        }
    }
}