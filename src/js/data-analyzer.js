/**
 * Definición de temporadas para análisis estacional
 */
const TEMPORADAS = {
    VERANO_INICIO: 6,  // Junio (mes 6)
    VERANO_FIN: 9,     // Septiembre (mes 9)
    
    /**
     * Determina si un mes corresponde a la temporada de verano
     * @param {number} mes - Número del mes (1-12)
     * @returns {boolean} True si es verano
     */
    isVerano: function(mes) {
        return mes >= this.VERANO_INICIO && mes <= this.VERANO_FIN;
    },
    
    /**
     * Determina si un mes corresponde a la temporada de invierno
     * @param {number} mes - Número del mes (1-12)
     * @returns {boolean} True si es invierno
     */
    isInvierno: function(mes) {
        return !this.isVerano(mes);
    },
    
    /**
     * Obtiene el nombre de la temporada para un mes dado
     * @param {number} mes - Número del mes (1-12)
     * @returns {string} 'verano' o 'invierno'
     */
    getTemporada: function(mes) {
        return this.isVerano(mes) ? 'verano' : 'invierno';
    }
};

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

        // Calcular altas al día por temporadas
        this.stats.altasAlDia = this.calculateDailyRegistrations();

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
                
                if (matriculasEnPeriodo.length === 0) {
                    return null; // Filtrar después
                }
                
                // Recalcular estadísticas solo para las matrículas del período
                const temporalesEnPeriodo = matriculasEnPeriodo.filter(m => m.tipoMatricula === 'temporal');
                const permanentesEnPeriodo = matriculasEnPeriodo.filter(m => m.tipoMatricula === 'permanente');
                
                // Calcular días promedio por permiso
                const diasPromedio = this.calculateAveragePermitDays(temporalesEnPeriodo);
                
                // Calcular frecuencia estacional
                const frecuencia = this.calculateSeasonalFrequency(matriculasEnPeriodo);
                
                // Contar permisos cortos
                const permisosCortos = this.countShortPermits(matriculasEnPeriodo);
                
                // Contar solapamientos
                const solapamientos = this.countOverlappingPlates(matriculasEnPeriodo);
                
                // Encontrar pico simultáneo
                const peakData = this.findPeakSimultaneous(matriculasEnPeriodo);
                
                return {
                    socio: group.socio,
                    matriculas: matriculasEnPeriodo, // Para compatibilidad con la UI
                    matriculasDetalle: matriculasEnPeriodo,
                    totalMatriculas: matriculasEnPeriodo.length, // Total del período filtrado
                    temporales: temporalesEnPeriodo.length,
                    permanentes: permanentesEnPeriodo.length,
                    diasPromedioPermiso: diasPromedio,
                    frecuenciaEstacional: frecuencia,
                    permisosCortos: permisosCortos,
                    solapamientos: solapamientos,
                    picoSimultaneo: peakData.count,
                    picoDetalle: peakData.details,
                    fechaUltimoRegistro: group.fechaUltimoRegistro
                };
            })
            .filter(item => item !== null && item.totalMatriculas >= minMatriculas)
            .sort((a, b) => b.totalMatriculas - a.totalMatriculas);
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

                if (matriculasFiltradas.length === 0) {
                    return null; // Filtrar después
                }
                
                // Recalcular estadísticas solo para las matrículas filtradas
                const temporalesFiltradas = matriculasFiltradas.filter(m => m.tipoMatricula === 'temporal');
                const permanentesFiltradas = matriculasFiltradas.filter(m => m.tipoMatricula === 'permanente');
                
                // Calcular días promedio por permiso
                const diasPromedio = this.calculateAveragePermitDays(temporalesFiltradas);
                
                // Calcular frecuencia estacional
                const frecuencia = this.calculateSeasonalFrequency(matriculasFiltradas);
                
                // Contar permisos cortos
                const permisosCortos = this.countShortPermits(matriculasFiltradas);
                
                // Contar solapamientos
                const solapamientos = this.countOverlappingPlates(matriculasFiltradas);
                
                // Encontrar pico simultáneo
                const peakData = this.findPeakSimultaneous(matriculasFiltradas);

                return {
                    socio: group.socio,
                    matriculas: matriculasFiltradas, // Para compatibilidad con la UI
                    matriculasDetalle: matriculasFiltradas,
                    totalMatriculas: matriculasFiltradas.length, // Total filtrado
                    temporales: temporalesFiltradas.length,
                    permanentes: permanentesFiltradas.length,
                    diasPromedioPermiso: diasPromedio,
                    frecuenciaEstacional: frecuencia,
                    permisosCortos: permisosCortos,
                    solapamientos: solapamientos,
                    picoSimultaneo: peakData.count,
                    picoDetalle: peakData.details,
                    fechaUltimoRegistro: group.fechaUltimoRegistro
                };
            })
            .filter(item => item !== null)
            .sort((a, b) => b.totalMatriculas - a.totalMatriculas);
    }

    /**
     * Filtra socios por temporada
     * @param {string} temporada - 'verano', 'invierno' o 'all'
     * @param {number} minMatriculas - Mínimo número de matrículas
     * @returns {Array} Array de socios filtrados
     */
    filterSociosBySeason(temporada, minMatriculas = 1) {
        if (temporada === 'all') {
            return this.getGroupedBySocio().filter(group => 
                (group.matriculas ? group.matriculas.length : group.totalMatriculas) >= minMatriculas
            );
        }

        return Array.from(this.groupedData.values())
            .map(group => {
                // Filtrar matrículas por temporada basándose en la fecha de inicio
                const matriculasFiltradas = group.matriculas.filter(m => {
                    if (!m.fechaInicio) return false;
                    
                    const mes = m.fechaInicio.getMonth() + 1; // Convertir a 1-12
                    const esVerano = TEMPORADAS.isVerano(mes);
                    
                    if (temporada === 'verano') {
                        return esVerano;
                    } else if (temporada === 'invierno') {
                        return !esVerano;
                    }
                    
                    return false;
                });

                if (matriculasFiltradas.length < minMatriculas) {
                    return null;
                }

                // Recalcular estadísticas para las matrículas filtradas
                const temporalesFiltradas = matriculasFiltradas.filter(m => m.tipoMatricula === 'temporal');
                const permanentesFiltradas = matriculasFiltradas.filter(m => m.tipoMatricula === 'permanente');
                
                const diasPromedio = this.calculateAveragePermitDays(temporalesFiltradas);
                const frecuencia = this.calculateSeasonalFrequency(matriculasFiltradas);
                const permisosCortos = this.countShortPermits(matriculasFiltradas);
                const solapamientos = this.countOverlappingPlates(matriculasFiltradas);
                const peakData = this.findPeakSimultaneous(matriculasFiltradas);

                return {
                    socio: group.socio,
                    matriculas: matriculasFiltradas,
                    matriculasDetalle: matriculasFiltradas,
                    totalMatriculas: matriculasFiltradas.length,
                    temporales: temporalesFiltradas.length,
                    permanentes: permanentesFiltradas.length,
                    diasPromedioPermiso: diasPromedio,
                    frecuenciaEstacional: frecuencia,
                    permisosCortos: permisosCortos,
                    solapamientos: solapamientos,
                    picoSimultaneo: peakData.count,
                    picoDetalle: peakData.details,
                    fechaUltimoRegistro: group.fechaUltimoRegistro
                };
            })
            .filter(item => item !== null)
            .sort((a, b) => b.totalMatriculas - a.totalMatriculas);
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
     * Obtiene los datos agrupados por socio
     * @returns {Array} Array de socios con sus matrículas
     */
    getGroupedBySocio() {
        return Array.from(this.groupedData.values())
            .map(group => {
                const analytics = this.calculateSocioAnalytics(group);
                return {
                    socio: group.socio,
                    matriculas: group.matriculas,
                    totalMatriculas: group.matriculas.length,
                    temporales: group.temporales,
                    permanentes: group.permanentes,
                    fechaUltimoRegistro: group.fechaUltimoRegistro,
                    ...analytics
                };
            })
            .sort((a, b) => b.totalMatriculas - a.totalMatriculas);
    }

    /**
     * Calcula métricas avanzadas para un socio
     * @param {Object} group - Grupo de datos del socio
     * @returns {Object} Métricas calculadas
     */
    calculateSocioAnalytics(group) {
        const matriculas = group.matriculas;
        const peakData = this.findPeakSimultaneous(matriculas);
        
        return {
            diasPromedioPermiso: this.calculateAveragePermitDays(matriculas),
            frecuenciaEstacional: this.calculateSeasonalFrequency(matriculas),
            permisosCortos: this.countShortPermits(matriculas),
            solapamientos: this.countOverlappingPlates(matriculas),
            picoSimultaneo: peakData.count,
            picoDetalle: peakData.details
        };
    }

    /**
     * Calcula los días promedio de los permisos temporales
     * @param {Array} matriculas - Array de matrículas
     * @returns {number} Días promedio
     */
    calculateAveragePermitDays(matriculas) {
        const temporales = matriculas.filter(m => 
            m.tipoMatricula === 'temporal' && m.fechaInicio && m.fechaFin
        );
        
        if (temporales.length === 0) return 0;
        
        const totalDias = temporales.reduce((sum, m) => {
            const dias = Math.ceil((m.fechaFin - m.fechaInicio) / (1000 * 60 * 60 * 24));
            return sum + Math.max(1, dias); // Mínimo 1 día
        }, 0);
        
        return Math.round((totalDias / temporales.length) * 10) / 10; // 1 decimal
    }

    /**
     * Calcula la frecuencia mensual por estación
     * @param {Array} matriculas - Array de matrículas
     * @returns {Object} Frecuencias de verano e invierno
     */
    calculateSeasonalFrequency(matriculas) {
        const registrosPorMes = new Map();
        
        // Agrupar registros por año-mes
        matriculas.forEach(m => {
            if (m.fechaInicio) {
                const yearMonth = `${m.fechaInicio.getFullYear()}-${m.fechaInicio.getMonth()}`;
                if (!registrosPorMes.has(yearMonth)) {
                    registrosPorMes.set(yearMonth, { verano: 0, invierno: 0, mes: m.fechaInicio.getMonth() });
                }
                
                const mes = m.fechaInicio.getMonth() + 1; // Convertir a 1-12 para usar TEMPORADAS
                if (TEMPORADAS.isVerano(mes)) {
                    registrosPorMes.get(yearMonth).verano++;
                } else {
                    registrosPorMes.get(yearMonth).invierno++;
                }
            }
        });
        
        // Calcular promedios
        const mesesConVerano = Array.from(registrosPorMes.values()).filter(m => m.verano > 0);
        const mesesConInvierno = Array.from(registrosPorMes.values()).filter(m => m.invierno > 0);
        
        const promedioVerano = mesesConVerano.length > 0 
            ? mesesConVerano.reduce((sum, m) => sum + m.verano, 0) / mesesConVerano.length 
            : 0;
            
        const promedioInvierno = mesesConInvierno.length > 0 
            ? mesesConInvierno.reduce((sum, m) => sum + m.invierno, 0) / mesesConInvierno.length 
            : 0;
        
        return {
            verano: Math.round(promedioVerano * 10) / 10,
            invierno: Math.round(promedioInvierno * 10) / 10
        };
    }

    /**
     * Cuenta permisos de 7 días o menos
     * @param {Array} matriculas - Array de matrículas
     * @returns {number} Número de permisos cortos
     */
    countShortPermits(matriculas) {
        return matriculas.filter(m => {
            if (m.tipoMatricula !== 'temporal' || !m.fechaInicio || !m.fechaFin) return false;
            const dias = Math.ceil((m.fechaFin - m.fechaInicio) / (1000 * 60 * 60 * 24));
            return dias <= 7;
        }).length;
    }

    /**
     * Cuenta solapamientos de matrículas activas simultáneamente
     * @param {Array} matriculas - Array de matrículas
     * @returns {number} Número de solapamientos detectados
     */
    countOverlappingPlates(matriculas) {
        let solapamientos = 0;
        
        for (let i = 0; i < matriculas.length; i++) {
            for (let j = i + 1; j < matriculas.length; j++) {
                const m1 = matriculas[i];
                const m2 = matriculas[j];
                
                // Solo verificar matrículas diferentes
                if (m1.matricula === m2.matricula) continue;
                
                if (this.datesOverlap(m1.fechaInicio, m1.fechaFin, m2.fechaInicio, m2.fechaFin)) {
                    solapamientos++;
                }
            }
        }
        
        return solapamientos;
    }

    /**
     * Encuentra el pico máximo de matrículas temporales simultáneas
     * Solo considera matrículas temporales con fechas de inicio y fin definidas
     * @param {Array} matriculas - Array de matrículas
     * @returns {Object} Objeto con count (número) y details (detalles del pico)
     */
    findPeakSimultaneous(matriculas) {
        const eventos = [];
        
        // Filtrar solo matrículas temporales para el cálculo del pico
        const matriculasTemporales = matriculas.filter(m => 
            m.tipoMatricula === 'temporal' && m.fechaInicio && m.fechaFin
        );
        
        // Crear eventos de inicio y fin solo para temporales
        matriculasTemporales.forEach(m => {
            eventos.push({ fecha: m.fechaInicio, tipo: 'inicio', matricula: m.matricula });
            eventos.push({ fecha: m.fechaFin, tipo: 'fin', matricula: m.matricula });
        });
        
        // Ordenar eventos por fecha
        eventos.sort((a, b) => a.fecha - b.fecha);
        
        let activas = 0;
        let maxSimultaneas = 0;
        let matriculasActivas = new Set();
        let peakDetails = {
            cantidad: 0,
            fecha: null,
            matriculas: []
        };
        
        eventos.forEach(evento => {
            if (evento.tipo === 'inicio') {
                activas++;
                matriculasActivas.add(evento.matricula);
                
                if (activas > maxSimultaneas) {
                    maxSimultaneas = activas;
                    peakDetails = {
                        cantidad: activas,
                        fecha: evento.fecha,
                        matriculas: Array.from(matriculasActivas)
                    };
                }
            } else {
                activas--;
                matriculasActivas.delete(evento.matricula);
            }
        });
        
        return {
            count: maxSimultaneas,
            details: peakDetails
        };
    }

    /**
     * Verifica si dos rangos de fechas se solapan
     * @param {Date} inicio1 - Fecha inicio del primer rango
     * @param {Date} fin1 - Fecha fin del primer rango
     * @param {Date} inicio2 - Fecha inicio del segundo rango
     * @param {Date} fin2 - Fecha fin del segundo rango
     * @returns {boolean} True si se solapan
     */
    datesOverlap(inicio1, fin1, inicio2, fin2) {
        if (!inicio1 || !inicio2) return false;
        
        // Para permanentes sin fecha fin, usar fecha muy lejana
        const f1 = fin1 || new Date('2999-12-31');
        const f2 = fin2 || new Date('2999-12-31');
        
        return inicio1 < f2 && inicio2 < f1;
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

    /**
     * Calcula el promedio de altas al día por temporadas
     * @returns {Object} Objeto con promedios de verano e invierno
     */
    calculateDailyRegistrations() {
        if (this.data.length === 0) {
            return { promedio: 0, verano: 0, invierno: 0, detalle: 'Sin datos' };
        }

        // Agrupar registros por día
        const registrosPorDia = new Map();
        
        for (const record of this.data) {
            if (!record.fechaInicio) continue;
            
            const fecha = new Date(record.fechaInicio);
            const fechaKey = `${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}`;
            
            if (!registrosPorDia.has(fechaKey)) {
                registrosPorDia.set(fechaKey, {
                    fecha: fecha,
                    count: 0
                });
            }
            
            registrosPorDia.get(fechaKey).count++;
        }

        // Separar por temporadas usando la constante centralizada
        let registrosVerano = [];
        let registrosInvierno = [];
        
        for (const [, dayData] of registrosPorDia) {
            const mes = dayData.fecha.getMonth() + 1; // Convertir a 1-12 para usar TEMPORADAS
            
            if (TEMPORADAS.isVerano(mes)) {
                registrosVerano.push(dayData.count);
            } else {
                registrosInvierno.push(dayData.count);
            }
        }

        // Calcular promedios
        const promedioVerano = registrosVerano.length > 0 ? 
            (registrosVerano.reduce((sum, count) => sum + count, 0) / registrosVerano.length) : 0;
            
        const promedioInvierno = registrosInvierno.length > 0 ? 
            (registrosInvierno.reduce((sum, count) => sum + count, 0) / registrosInvierno.length) : 0;
            
        const promedioGeneral = registrosPorDia.size > 0 ? 
            (this.data.length / registrosPorDia.size) : 0;

        return {
            promedio: Math.round(promedioGeneral * 10) / 10,
            verano: Math.round(promedioVerano * 10) / 10,
            invierno: Math.round(promedioInvierno * 10) / 10,
            detalle: `☀️ ${Math.round(promedioVerano * 10) / 10} / ❄️ ${Math.round(promedioInvierno * 10) / 10}`
        };
    }
}
