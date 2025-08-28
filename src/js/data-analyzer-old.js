/**
 * Clase para analizar datos de matrículas y realizar agrupaciones
 */
class DataAnalyzer {
    constructor() {
        this.rawData = [];
        this.processedData = [];
        this.memberGroups = new Map();
    }

    /**
     * Carga y procesa los datos del CSV
     * @param {Array} csvData - Datos del CSV parseado
     */
    loadData(csvData) {
        this.rawData = csvData;
        this.processData();
        this.groupByMember();
    }

    /**
     * Procesa los datos añadiendo campos calculados
     */
    processData() {
        this.processedData = this.rawData.map(record => {
            const now = new Date();
            const isActive = this.isRecordActive(record, now);
            const season = this.getSeason(record.fechaInicio || record.fechaFin);
            
            return {
                ...record,
                isActive,
                season,
                duration: this.calculateDuration(record.fechaInicio, record.fechaFin)
            };
        });
    }

    /**
     * Agrupa los datos por socio
     */
    groupByMember() {
        this.memberGroups.clear();
        
        for (const record of this.processedData) {
            if (!this.memberGroups.has(record.socio)) {
                this.memberGroups.set(record.socio, {
                    memberName: record.socio,
                    plates: new Set(),
                    records: [],
                    activeRecords: [],
                    totalRecords: 0,
                    dateRange: { start: null, end: null },
                    seasons: new Set()
                });
            }
            
            const group = this.memberGroups.get(record.socio);
            group.plates.add(record.matricula);
            group.records.push(record);
            group.totalRecords++;
            
            if (record.isActive) {
                group.activeRecords.push(record);
            }
            
            // Actualizar rango de fechas
            if (record.fechaInicio) {
                if (!group.dateRange.start || record.fechaInicio < group.dateRange.start) {
                    group.dateRange.start = record.fechaInicio;
                }
            }
            
            if (record.fechaFin) {
                if (!group.dateRange.end || record.fechaFin > group.dateRange.end) {
                    group.dateRange.end = record.fechaFin;
                }
            }
            
            if (record.season) {
                group.seasons.add(record.season);
            }
        }
    }

    /**
     * Determina si un registro está activo en una fecha dada
     * @param {Object} record - Registro a evaluar
     * @param {Date} date - Fecha de referencia
     * @returns {boolean} True si está activo
     */
    isRecordActive(record, date = new Date()) {
        const { fechaInicio, fechaFin } = record;
        
        // Si no hay fechas, no se puede determinar
        if (!fechaInicio && !fechaFin) return false;
        
        // Si solo hay fecha de inicio, considerar activo si es posterior a la fecha
        if (fechaInicio && !fechaFin) {
            return fechaInicio <= date;
        }
        
        // Si solo hay fecha de fin, considerar activo si no ha expirado
        if (!fechaInicio && fechaFin) {
            return date <= fechaFin;
        }
        
        // Si hay ambas fechas, verificar que esté en el rango
        return fechaInicio <= date && date <= fechaFin;
    }

    /**
     * Obtiene la estación del año para una fecha
     * @param {Date} date - Fecha a evaluar
     * @returns {string|null} Estación del año
     */
    getSeason(date) {
        if (!date) return null;
        
        const month = date.getMonth() + 1; // getMonth() devuelve 0-11
        
        if (month >= 12 || month <= 2) return 'winter';
        if (month >= 3 && month <= 5) return 'spring';
        if (month >= 6 && month <= 8) return 'summer';
        if (month >= 9 && month <= 11) return 'autumn';
        
        return null;
    }

    /**
     * Calcula la duración en días entre dos fechas
     * @param {Date} startDate - Fecha de inicio
     * @param {Date} endDate - Fecha de fin
     * @returns {number|null} Duración en días
     */
    calculateDuration(startDate, endDate) {
        if (!startDate || !endDate) return null;
        
        const timeDiff = endDate.getTime() - startDate.getTime();
        return Math.ceil(timeDiff / (1000 * 3600 * 24));
    }

    /**
     * Aplica filtros a los datos agrupados
     * @param {Object} filters - Filtros a aplicar
     * @returns {Array} Datos filtrados
     */
    applyFilters(filters = {}) {
        const {
            minPlates = 1,
            dateRangeDays = null,
            season = 'all',
            onlyActive = false
        } = filters;
        
        let filteredGroups = Array.from(this.memberGroups.values());
        
        // Filtro por número mínimo de matrículas
        if (minPlates > 1) {
            filteredGroups = filteredGroups.filter(group => group.plates.size >= minPlates);
        }
        
        // Filtro por rango de fechas
        if (dateRangeDays) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - dateRangeDays);
            
            filteredGroups = filteredGroups.filter(group => 
                group.records.some(record => 
                    (record.fechaInicio && record.fechaInicio >= cutoffDate) ||
                    (record.fechaFin && record.fechaFin >= cutoffDate)
                )
            );
        }
        
        // Filtro por estación
        if (season !== 'all') {
            filteredGroups = filteredGroups.filter(group => 
                group.seasons.has(season)
            );
        }
        
        // Filtro solo activos
        if (onlyActive) {
            filteredGroups = filteredGroups.filter(group => 
                group.activeRecords.length > 0
            );
        }
        
        return filteredGroups.map(group => ({
            member: group.memberName,
            platesCount: group.plates.size,
            plates: Array.from(group.plates).sort(),
            totalRecords: group.totalRecords,
            activeRecords: group.activeRecords.length,
            dateRange: this.formatDateRange(group.dateRange),
            seasons: Array.from(group.seasons),
            status: group.activeRecords.length > 0 ? 'active' : 'expired',
            records: group.records
        }));
    }

    /**
     * Formatea un rango de fechas para mostrar
     * @param {Object} dateRange - Rango de fechas
     * @returns {string} Rango formateado
     */
    formatDateRange(dateRange) {
        const { start, end } = dateRange;
        
        if (!start && !end) return 'Sin fechas';
        if (!start) return `Hasta ${this.formatDate(end)}`;
        if (!end) return `Desde ${this.formatDate(start)}`;
        
        if (start.getTime() === end.getTime()) {
            return this.formatDate(start);
        }
        
        return `${this.formatDate(start)} - ${this.formatDate(end)}`;
    }

    /**
     * Formatea una fecha para mostrar
     * @param {Date} date - Fecha a formatear
     * @returns {string} Fecha formateada
     */
    formatDate(date) {
        if (!date) return '';
        
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    /**
     * Obtiene estadísticas generales de los datos
     * @returns {Object} Estadísticas
     */
    getGeneralStats() {
        const totalRecords = this.processedData.length;
        const totalMembers = this.memberGroups.size;
        const totalPlates = new Set(this.processedData.map(r => r.matricula)).size;
        const activeRecords = this.processedData.filter(r => r.isActive).length;
        
        // Estadísticas por miembro
        const platesPerMember = Array.from(this.memberGroups.values()).map(g => g.plates.size);
        const avgPlatesPerMember = platesPerMember.length > 0 
            ? (platesPerMember.reduce((sum, count) => sum + count, 0) / platesPerMember.length).toFixed(1)
            : 0;
        
        const maxPlatesPerMember = platesPerMember.length > 0 ? Math.max(...platesPerMember) : 0;
        const minPlatesPerMember = platesPerMember.length > 0 ? Math.min(...platesPerMember) : 0;
        
        // Estadísticas por estación
        const seasonStats = {
            winter: 0,
            spring: 0,
            summer: 0,
            autumn: 0
        };
        
        this.processedData.forEach(record => {
            if (record.season) {
                seasonStats[record.season]++;
            }
        });
        
        return {
            totalRecords,
            totalMembers,
            totalPlates,
            activeRecords,
            expiredRecords: totalRecords - activeRecords,
            avgPlatesPerMember,
            maxPlatesPerMember,
            minPlatesPerMember,
            seasonStats,
            dataRange: this.getDataDateRange()
        };
    }

    /**
     * Obtiene el rango de fechas de todos los datos
     * @returns {Object} Rango de fechas
     */
    getDataDateRange() {
        let minDate = null;
        let maxDate = null;
        
        this.processedData.forEach(record => {
            if (record.fechaInicio) {
                if (!minDate || record.fechaInicio < minDate) {
                    minDate = record.fechaInicio;
                }
            }
            if (record.fechaFin) {
                if (!maxDate || record.fechaFin > maxDate) {
                    maxDate = record.fechaFin;
                }
            }
        });
        
        return {
            start: minDate,
            end: maxDate,
            formatted: this.formatDateRange({ start: minDate, end: maxDate })
        };
    }

    /**
     * Busca socios que podrían estar abusando del sistema
     * @param {Object} criteria - Criterios de búsqueda
     * @returns {Array} Socios sospechosos
     */
    findSuspiciousMembers(criteria = {}) {
        const {
            minPlates = 10,
            shortDuration = 30, // días
            overlappingPeriods = true
        } = criteria;
        
        const suspicious = [];
        
        for (const group of this.memberGroups.values()) {
            const issues = [];
            
            // Muchas matrículas
            if (group.plates.size >= minPlates) {
                issues.push(`${group.plates.size} matrículas registradas`);
            }
            
            // Períodos cortos frecuentes
            const shortPeriods = group.records.filter(record => 
                record.duration && record.duration <= shortDuration
            );
            
            if (shortPeriods.length >= 3) {
                issues.push(`${shortPeriods.length} períodos de ${shortDuration} días o menos`);
            }
            
            // Períodos solapados (misma matrícula, fechas solapadas)
            if (overlappingPeriods) {
                const overlaps = this.findOverlappingPeriods(group.records);
                if (overlaps.length > 0) {
                    issues.push(`${overlaps.length} períodos solapados detectados`);
                }
            }
            
            if (issues.length > 0) {
                suspicious.push({
                    member: group.memberName,
                    platesCount: group.plates.size,
                    issues: issues,
                    severity: this.calculateSeverity(issues.length, group.plates.size),
                    records: group.records
                });
            }
        }
        
        return suspicious.sort((a, b) => b.severity - a.severity);
    }

    /**
     * Encuentra períodos solapados para un conjunto de registros
     * @param {Array} records - Registros a analizar
     * @returns {Array} Períodos solapados
     */
    findOverlappingPeriods(records) {
        const overlaps = [];
        
        for (let i = 0; i < records.length; i++) {
            for (let j = i + 1; j < records.length; j++) {
                const record1 = records[i];
                const record2 = records[j];
                
                // Solo verificar si es la misma matrícula
                if (record1.matricula === record2.matricula) {
                    if (this.periodsOverlap(record1, record2)) {
                        overlaps.push({ record1, record2 });
                    }
                }
            }
        }
        
        return overlaps;
    }

    /**
     * Verifica si dos períodos se solapan
     * @param {Object} period1 - Primer período
     * @param {Object} period2 - Segundo período
     * @returns {boolean} True si se solapan
     */
    periodsOverlap(period1, period2) {
        const start1 = period1.fechaInicio;
        const end1 = period1.fechaFin;
        const start2 = period2.fechaInicio;
        const end2 = period2.fechaFin;
        
        // Si faltan fechas, no se puede determinar solapamiento
        if (!start1 || !end1 || !start2 || !end2) return false;
        
        return start1 <= end2 && start2 <= end1;
    }

    /**
     * Calcula la severidad de un caso sospechoso
     * @param {number} issuesCount - Número de problemas
     * @param {number} platesCount - Número de matrículas
     * @returns {number} Puntuación de severidad
     */
    calculateSeverity(issuesCount, platesCount) {
        return issuesCount * 10 + Math.min(platesCount, 50);
    }

    /**
     * Exporta datos a CSV
     * @param {Array} data - Datos a exportar
     * @param {string} filename - Nombre del archivo
     */
    exportToCSV(data, filename = 'salions_analisis.csv') {
        const headers = ['Socio', 'Num_Matriculas', 'Matriculas', 'Rango_Fechas', 'Estado', 'Registros_Activos'];
        const csvContent = [
            headers.join(','),
            ...data.map(row => [
                `"${row.member}"`,
                row.platesCount,
                `"${row.plates.join(', ')}"`,
                `"${row.dateRange}"`,
                row.status,
                row.activeRecords
            ].join(','))
        ].join('\n');
        
        this.downloadCSV(csvContent, filename);
    }

    /**
     * Descarga un archivo CSV
     * @param {string} content - Contenido del CSV
     * @param {string} filename - Nombre del archivo
     */
    downloadCSV(content, filename) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
