/**
 * Clase para analizar datos de matrículas procesadas (formato actualizado)
 */
class DataAnalyzer {
    constructor(data) {
        this.data = data || [];
        this.groupedData = new Map();
        this.stats = {};
        this.analyze();
    }

    /**
     * Analiza los datos y genera estadísticas
     */
    analyze() {
        this.groupedData.clear();
        this.stats = {
            totalMatriculas: this.data.length,
            totalSocios: 0,
            matriculasTemporales: 0,
            matriculasPermanentes: 0,
            fechaInicioMin: null,
            fechaInicioMax: null,
            fechaFinMin: null,
            fechaFinMax: null,
            sociosConMasMatriculas: [],
            matriculasPorMes: new Map(),
            usuariosRegistradores: new Map()
        };

        if (this.data.length === 0) return;

        // Agrupar por socio
        for (const record of this.data) {
            const socioKey = record.socio.toLowerCase().trim();
            
            if (!this.groupedData.has(socioKey)) {
                this.groupedData.set(socioKey, {
                    socio: record.socio,
                    matriculas: [],
                    temporales: 0,
                    permanentes: 0,
                    fechaUltimoRegistro: null
                });
            }
            
            const group = this.groupedData.get(socioKey);
            group.matriculas.push(record);

            // Contar tipos de matrícula
            if (record.tipoMatricula === 'temporal') {
                group.temporales++;
                this.stats.matriculasTemporales++;
            } else {
                group.permanentes++;
                this.stats.matriculasPermanentes++;
            }

            // Actualizar fecha de último registro
            if (!group.fechaUltimoRegistro || record.fechaInicio > group.fechaUltimoRegistro) {
                group.fechaUltimoRegistro = record.fechaInicio;
            }

            // Estadísticas de fechas
            if (!this.stats.fechaInicioMin || record.fechaInicio < this.stats.fechaInicioMin) {
                this.stats.fechaInicioMin = record.fechaInicio;
            }
            if (!this.stats.fechaInicioMax || record.fechaInicio > this.stats.fechaInicioMax) {
                this.stats.fechaInicioMax = record.fechaInicio;
            }

            if (record.fechaFin) {
                if (!this.stats.fechaFinMin || record.fechaFin < this.stats.fechaFinMin) {
                    this.stats.fechaFinMin = record.fechaFin;
                }
                if (!this.stats.fechaFinMax || record.fechaFin > this.stats.fechaFinMax) {
                    this.stats.fechaFinMax = record.fechaFin;
                }
            }

            // Estadísticas por mes
            const monthKey = `${record.fechaInicio.getFullYear()}-${String(record.fechaInicio.getMonth() + 1).padStart(2, '0')}`;
            this.stats.matriculasPorMes.set(monthKey, (this.stats.matriculasPorMes.get(monthKey) || 0) + 1);

            // Usuarios registradores
            if (record.usuario) {
                this.stats.usuariosRegistradores.set(record.usuario, (this.stats.usuariosRegistradores.get(record.usuario) || 0) + 1);
            }
        }

        this.stats.totalSocios = this.groupedData.size;

        // Encontrar socios con más matrículas
        this.stats.sociosConMasMatriculas = Array.from(this.groupedData.values())
            .sort((a, b) => b.matriculas.length - a.matriculas.length)
            .slice(0, 10)
            .map(group => ({
                socio: group.socio,
                totalMatriculas: group.matriculas.length,
                temporales: group.temporales,
                permanentes: group.permanentes,
                fechaUltimoRegistro: group.fechaUltimoRegistro
            }));
    }

    /**
     * Obtiene datos agrupados por socio
     * @returns {Array} Array de grupos por socio
     */
    getGroupedBySocio() {
        return Array.from(this.groupedData.values())
            .sort((a, b) => a.socio.localeCompare(b.socio, 'es', { sensitivity: 'base' }));
    }

    /**
     * Filtra socios por número de matrículas en un período
     * @param {number} minMatriculas - Número mínimo de matrículas
     * @param {number} diasAtras - Días hacia atrás desde hoy
     * @returns {Array} Array de socios que cumplen el criterio
     */
    filterSociosByMatriculasInPeriod(minMatriculas, diasAtras = 30) {
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() - diasAtras);
        
        return Array.from(this.groupedData.values())
            .map(group => {
                const matriculasEnPeriodo = group.matriculas.filter(m => m.fechaInicio >= fechaLimite);
                return {
                    socio: group.socio,
                    matriculasEnPeriodo: matriculasEnPeriodo.length,
                    matriculasDetalle: matriculasEnPeriodo,
                    totalMatriculas: group.matriculas.length,
                    temporales: group.temporales,
                    permanentes: group.permanentes
                };
            })
            .filter(item => item.matriculasEnPeriodo >= minMatriculas)
            .sort((a, b) => b.matriculasEnPeriodo - a.matriculasEnPeriodo);
    }

    /**
     * Filtra socios por tipo de matrícula
     * @param {string} tipo - 'temporal' o 'permanente'
     * @param {number} diasAtras - Días hacia atrás desde hoy para el filtro temporal
     * @returns {Array} Array de socios filtrados
     */
    filterSociosByMatriculaType(tipo, diasAtras = 30) {
        let fechaLimite = null;
        if (diasAtras > 0) {
            fechaLimite = new Date();
            fechaLimite.setDate(fechaLimite.getDate() - diasAtras);
        }

        return Array.from(this.groupedData.values())
            .map(group => {
                let matriculasFiltradas;
                
                if (fechaLimite) {
                    matriculasFiltradas = group.matriculas.filter(m => 
                        m.tipoMatricula === tipo && m.fechaInicio >= fechaLimite
                    );
                } else {
                    matriculasFiltradas = group.matriculas.filter(m => m.tipoMatricula === tipo);
                }

                return {
                    socio: group.socio,
                    matriculasFiltradas: matriculasFiltradas.length,
                    matriculasDetalle: matriculasFiltradas,
                    totalMatriculas: group.matriculas.length,
                    temporales: group.temporales,
                    permanentes: group.permanentes
                };
            })
            .filter(item => item.matriculasFiltradas > 0)
            .sort((a, b) => b.matriculasFiltradas - a.matriculasFiltradas);
    }

    /**
     * Busca socios por texto
     * @param {string} searchText - Texto a buscar
     * @returns {Array} Array de socios que coinciden
     */
    searchSocios(searchText) {
        const searchLower = searchText.toLowerCase().trim();
        if (!searchLower) return this.getGroupedBySocio();

        return Array.from(this.groupedData.values())
            .filter(group => 
                group.socio.toLowerCase().includes(searchLower) ||
                group.matriculas.some(m => 
                    m.matricula.toLowerCase().includes(searchLower) ||
                    (m.nota && m.nota.toLowerCase().includes(searchLower))
                )
            )
            .sort((a, b) => a.socio.localeCompare(b.socio, 'es', { sensitivity: 'base' }));
    }

    /**
     * Filtra matrículas duplicadas (misma matrícula, diferente socio)
     * @returns {Array} Array de matrículas duplicadas
     */
    findDuplicatePlates() {
        const plateMap = new Map();
        const duplicates = [];

        // Agrupar por matrícula
        for (const record of this.data) {
            const plate = record.matricula.toLowerCase();
            if (!plateMap.has(plate)) {
                plateMap.set(plate, []);
            }
            plateMap.get(plate).push(record);
        }

        // Encontrar duplicados
        for (const [plate, records] of plateMap) {
            if (records.length > 1) {
                // Verificar si son socios diferentes
                const socios = new Set(records.map(r => r.socio.toLowerCase()));
                if (socios.size > 1) {
                    duplicates.push({
                        matricula: records[0].matricula,
                        registros: records,
                        sociosInvolucrados: Array.from(socios).map(s => 
                            records.find(r => r.socio.toLowerCase() === s).socio
                        )
                    });
                }
            }
        }

        return duplicates.sort((a, b) => a.matricula.localeCompare(b.matricula));
    }

    /**
     * Obtiene estadísticas por período de tiempo
     * @param {string} periodo - 'dia', 'semana', 'mes' o 'año'
     * @returns {Array} Array de estadísticas por período
     */
    getStatsByPeriod(periodo = 'mes') {
        const stats = new Map();

        for (const record of this.data) {
            let key;
            const date = record.fechaInicio;

            switch (periodo) {
                case 'dia':
                    key = date.toISOString().split('T')[0];
                    break;
                case 'semana':
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay());
                    key = weekStart.toISOString().split('T')[0];
                    break;
                case 'mes':
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    break;
                case 'año':
                    key = date.getFullYear().toString();
                    break;
                default:
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            }

            if (!stats.has(key)) {
                stats.set(key, {
                    periodo: key,
                    total: 0,
                    temporales: 0,
                    permanentes: 0,
                    sociosUnicos: new Set()
                });
            }

            const stat = stats.get(key);
            stat.total++;
            stat.sociosUnicos.add(record.socio.toLowerCase());
            
            if (record.tipoMatricula === 'temporal') {
                stat.temporales++;
            } else {
                stat.permanentes++;
            }
        }

        // Convertir a array y agregar count de socios únicos
        return Array.from(stats.values())
            .map(stat => ({
                ...stat,
                sociosUnicos: stat.sociosUnicos.size
            }))
            .sort((a, b) => a.periodo.localeCompare(b.periodo));
    }

    /**
     * Obtiene las estadísticas generales
     * @returns {Object} Objeto con estadísticas
     */
    getStats() {
        return {
            ...this.stats,
            matriculasPorMes: Array.from(this.stats.matriculasPorMes.entries())
                .map(([mes, count]) => ({ mes, count }))
                .sort((a, b) => a.mes.localeCompare(b.mes)),
            usuariosRegistradores: Array.from(this.stats.usuariosRegistradores.entries())
                .map(([usuario, count]) => ({ usuario, count }))
                .sort((a, b) => b.count - a.count)
        };
    }

    /**
     * Exporta datos filtrados a CSV
     * @param {Array} filteredData - Datos filtrados
     * @returns {string} CSV string
     */
    exportToCSV(filteredData) {
        if (!filteredData || filteredData.length === 0) {
            return 'No hay datos para exportar';
        }

        const headers = ['Socio', 'Matrícula', 'Tipo', 'Fecha Inicio', 'Fecha Fin', 'Usuario', 'Nota'];
        const csvLines = [headers.join(',')];

        for (const group of filteredData) {
            for (const matricula of group.matriculasDetalle || group.matriculas || [matricula]) {
                const line = [
                    `"${group.socio || matricula.socio}"`,
                    `"${matricula.matricula}"`,
                    `"${matricula.tipoMatricula || 'N/A'}"`,
                    `"${matricula.fechaInicio ? matricula.fechaInicio.toLocaleDateString('es-ES') : 'N/A'}"`,
                    `"${matricula.fechaFin ? matricula.fechaFin.toLocaleDateString('es-ES') : 'N/A'}"`,
                    `"${matricula.usuario || 'N/A'}"`,
                    `"${(matricula.nota || '').replace(/"/g, '""')}"`
                ];
                csvLines.push(line.join(','));
            }
        }

        return csvLines.join('\n');
    }
}
