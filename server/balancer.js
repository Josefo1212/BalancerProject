export class Balancer {
    constructor(listaIps = []) {
        this.nodos = {};

        if (listaIps.length === 0) {
            listaIps = ['localhost:4000'];
        }

        listaIps.forEach((ip, indice) => {
            this.nodos[ip.trim()] = {
                nombre: `Nodo_${indice + 1}`,
                latencia: 0,
                cpu: 0,
                ram: 0,
                procesos: 0,
                activo: true,
            };
        });
    }

    /**
     * Calcula la Carga Combinada (Score de Salud) de un nodo.
     *
     * Fórmula ponderada:
     *   Carga = (cpu * 0.5) + (ram * 0.4) + (procesos_normalizados * 0.1)
     *
     * Normalización de procesos: 0–500 procesos → 0%–100%
     */
    _calcularCargaCombinada(nodo) {
        const cpuScore = nodo.cpu * 0.5;
        const ramScore = nodo.ram * 0.4;

        // Normalizar procesos: rango [0, 500] → [0, 100]
        const procesosNormalizados = Math.min((nodo.procesos / 500) * 100, 100);
        const procesosScore = procesosNormalizados * 0.1;

        return cpuScore + ramScore + procesosScore;
    }

    /**
     * Selecciona el nodo con MENOR carga combinada (Least Loaded).
     * Solo evalúa nodos con activo === true.
     * Retorna la IP del nodo más saludable, o null si todos están caídos.
     */
    obtenerSiguienteNodo() {
        const listaIps = Object.keys(this.nodos);
        if (listaIps.length === 0) return null;

        let mejorIp = null;
        let menorCarga = Infinity;

        for (const ip of listaIps) {
            const nodo = this.nodos[ip];

            if (!nodo.activo) continue;

            const cargaCombinada = this._calcularCargaCombinada(nodo);

            if (cargaCombinada < menorCarga) {
                menorCarga = cargaCombinada;
                mejorIp = ip;
            }
        }

        if (mejorIp !== null) {
            const nodo = this.nodos[mejorIp];
            console.log(
                `⚖️  [Balancer] Nodo seleccionado: ${mejorIp} ` +
                `(Carga: ${menorCarga.toFixed(1)}% | CPU: ${nodo.cpu}% | RAM: ${nodo.ram}% | Proc: ${nodo.procesos})`
            );
        }

        return mejorIp;
    }

    /**
     * Actualiza las métricas de telemetría de un nodo con los datos
     * recibidos del microservicio gRPC tras procesar una petición.
     */
    actualizarMetricas(ip, nuevaLatencia, nuevoCpu, nuevoRam, nuevosProcesos) {
        if (this.nodos[ip]) {
            this.nodos[ip].latencia = nuevaLatencia;
            this.nodos[ip].cpu = nuevoCpu;
            this.nodos[ip].ram = nuevoRam;
            this.nodos[ip].procesos = nuevosProcesos;

            // Si un nodo fue previamente penalizado y ahora responde, reactivarlo
            if (!this.nodos[ip].activo) {
                this.nodos[ip].activo = true;
                console.log(`✅ [Balancer] Nodo ${ip} reactivado automáticamente tras respuesta exitosa.`);
            }
        }
    }

    /**
     * Penaliza un nodo que falló asignándole métricas máximas de castigo
     * y marcándolo como inactivo para que el balanceador lo evite.
     */
    penalizarNodoPorFallo(ip) {
        if (this.nodos[ip]) {
            this.nodos[ip].activo = false;
            this.nodos[ip].latencia = 9999;
            this.nodos[ip].cpu = 100;
            this.nodos[ip].ram = 100;
            this.nodos[ip].procesos = 999;
            console.log(`🚫 [Balancer] Nodo ${ip} penalizado y marcado como INACTIVO.`);
        }
    }
}