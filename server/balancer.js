export class Balancer {
    constructor(listaIps = []) {
        this.nodos = {};
        this.indiceActual = 0;

        if (listaIps.length === 0) {
            listaIps = ['localhost:4000'];
        }

        listaIps.forEach((ip, indice) => {
            this.nodos[ip.trim()] = {
                nombre: `Nodo_${indice + 1}`,
                latencia: 10,
                cpu: 10,
                activo: true
            };
        });
    }

    obtenerSiguienteNodo() {
        const listaIps = Object.keys(this.nodos);
        if (listaIps.length === 0) return null;

        const totalNodos = listaIps.length;

        for (let i = 0; i < totalNodos; i++) {
            const indice = (this.indiceActual + i) % totalNodos;
            const ip = listaIps[indice];

            if (this.nodos[ip].activo) {
                this.indiceActual = (indice + 1) % totalNodos;
                return ip;
            }
        }

        return null;
    }

    actualizarMetricas(ip, nuevaLatencia, nuevoCpu) {
        if (this.nodos[ip]) {
            this.nodos[ip].latencia = nuevaLatencia;
            this.nodos[ip].cpu = nuevoCpu;
        }
    }

    penalizarNodoPorFallo(ip) {
        if (this.nodos[ip]) {
            this.nodos[ip].activo = false;
            this.nodos[ip].latencia = 999;
            this.nodos[ip].cpu = 99;
        }
    }
}