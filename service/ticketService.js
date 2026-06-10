import os from 'os';
import { exec } from 'child_process';

export class TicketServiceHandler {
    constructor(nodeName = 'Nodo_desconocido') {
        this.totalTickets = 0;
        this.nodeName = nodeName;

        // Cache de procesos para no bloquear cada petición con un exec
        this._procesosCache = 150; // Fallback base
        this._actualizarContadorProcesos(); // Primera medición inmediata
        this._intervaloProcesos = setInterval(() => this._actualizarContadorProcesos(), 2000);

        this.generarTicket = this.generarTicket.bind(this);
    }

    // ─────────────────────────── CPU ───────────────────────────

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

    // ─────────────────────────── RAM ───────────────────────────

    calcularUsoRam() {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usoRam = 100 * (1 - freeMem / totalMem);
        return Math.max(0, Math.min(100, Math.round(usoRam)));
    }

    // ─────────────────────── PROCESOS ─────────────────────────

    _actualizarContadorProcesos() {
        const esWindows = process.platform === 'win32';
        const comando = esWindows ? 'tasklist' : 'ps -e | wc -l';

        exec(comando, { timeout: 3000 }, (error, stdout) => {
            if (error) {
                // Si falla, mantiene el último valor cacheado o el fallback
                return;
            }

            try {
                if (esWindows) {
                    // En Windows, tasklist devuelve una línea por proceso + encabezados.
                    // Contamos líneas no vacías y restamos las 3 líneas de encabezado.
                    const lineas = stdout.split('\n').filter((l) => l.trim().length > 0);
                    this._procesosCache = Math.max(0, lineas.length - 3);
                } else {
                    // En Linux/macOS, "ps -e | wc -l" devuelve el conteo directo.
                    // Se resta 1 por la línea de encabezado de ps.
                    const conteo = parseInt(stdout.trim(), 10);
                    this._procesosCache = isNaN(conteo) ? 150 : Math.max(0, conteo - 1);
                }
            } catch {
                // Fallback silencioso: no rompe el flujo
            }
        });
    }

    obtenerNumeroProcesos() {
        return this._procesosCache;
    }

    // ──────────────────── HANDLER gRPC ────────────────────────

    async generarTicket(call, callback) {
        this.totalTickets += 1;

        const nodeNameFromGateway = call.metadata?.get('node-name')?.[0];
        if (typeof nodeNameFromGateway === 'string' && nodeNameFromGateway.trim()) {
            this.nodeName = nodeNameFromGateway.trim();
        }

        try {
            // Recolectar las tres métricas reales de hardware
            const usoCpu = await this.medirUsoCpuReal();
            const usoRam = this.calcularUsoRam();
            const numProcesos = this.obtenerNumeroProcesos();

            const cliente = call.request?.cliente || 'desconocido';

            console.log(
                `[${this.nodeName}] ⚙️ Procesando petición de ${cliente}. ` +
                `Ticket #${this.totalTickets} | CPU: ${usoCpu}% | RAM: ${usoRam}% | Procesos: ${numProcesos}`
            );

            callback(null, {
                ok: true,
                ticketNumero: this.totalTickets,
                procesadoPor: this.nodeName,
                mensaje: `Ticket generado exitosamente en el nodo gRPC: ${this.nodeName}`,
                usoCpu,
                usoRam,
                numProcesos,
            });
        } catch (error) {
            callback(error);
        }
    }
}