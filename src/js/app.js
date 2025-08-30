/**
 * Aplicación principal para análisis de matrículas Salions
 */
class SalionsApp {
    constructor() {
        this.csvParser = new CSVParser();
        this.dataAnalyzer = new DataAnalyzer();
        this.ui = new UIComponents();
        this.currentData = null;
        
        this.init();
    }

    /**
     * Inicializa la aplicación
     */
    init() {
        this.setupEventListeners();
        this.ui.setupTableSorting();
        this.ui.setupPagination();
        
        // Mostrar mensaje de bienvenida
        console.log('🏘️ Salions Matrículas - Aplicación inicializada');
    }

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        // Upload de archivo
        this.setupFileUpload();
        
        // Filtros
        this.setupFilters();
        
        // Exportación
        this.setupExport();
    }

    /**
     * Configura la funcionalidad de carga de archivos
     */
    setupFileUpload() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const fileInfo = document.getElementById('fileInfo');

        // Click en área de upload
        uploadArea?.addEventListener('click', () => {
            fileInput?.click();
        });

        // Drag and drop
        uploadArea?.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });

        uploadArea?.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
        });

        uploadArea?.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelection(files[0]);
            }
        });

        // Selección de archivo
        fileInput?.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelection(e.target.files[0]);
            }
        });
    }

    /**
     * Maneja la selección de un archivo
     * @param {File} file - Archivo seleccionado
     */
    async handleFileSelection(file) {
        // Validar tipo de archivo
        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.ui.showNotification('Por favor, selecciona un archivo CSV válido', 'error');
            return;
        }

        // Validar tamaño (máximo 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            this.ui.showNotification('El archivo es demasiado grande. Máximo 10MB', 'error');
            return;
        }

        // Mostrar información del archivo
        this.showFileInfo(file);
        
        try {
            this.ui.showNotification('Procesando archivo CSV...', 'info');
            
            // Procesar archivo
            const parseResult = await this.csvParser.parseFile(file);
            
            // Mostrar estadísticas de parsing
            if (parseResult.errors.length > 0) {
                const errorMsg = `Archivo procesado con ${parseResult.errors.length} errores. ${parseResult.validRecords} registros válidos de ${parseResult.totalLines} líneas.`;
                this.ui.showNotification(errorMsg, 'warning', 8000);
                
                // Mostrar detalles de errores si hay muchos
                if (parseResult.errors.length > 5) {
                    this.showErrorDetails(parseResult.errors);
                }
            } else {
                this.ui.showNotification(`Archivo procesado exitosamente: ${parseResult.validRecords} registros`, 'success');
            }

            // Analizar datos con la nueva estructura
            this.analyzeData(parseResult.data);
            
        } catch (error) {
            console.error('Error procesando archivo:', error);
            this.ui.showNotification(`Error procesando archivo: ${error.message}`, 'error');
        }
    }

    /**
     * Muestra información del archivo seleccionado
     * @param {File} file - Archivo
     */
    showFileInfo(file) {
        const fileInfo = document.getElementById('fileInfo');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');

        if (fileName) fileName.textContent = file.name;
        if (fileSize) fileSize.textContent = this.formatFileSize(file.size);
        if (fileInfo) fileInfo.style.display = 'flex';
    }

    /**
     * Formatea el tamaño de archivo
     * @param {number} bytes - Tamaño en bytes
     * @returns {string} Tamaño formateado
     */
    formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    /**
     * Muestra detalles de errores en un modal
     * @param {Array} errors - Lista de errores
     */
    showErrorDetails(errors) {
        const errorList = errors.slice(0, 20).map(error => 
            `<div class="error-item">
                <strong>Línea ${error.line}:</strong> ${error.error}
                <br><small>${error.data}</small>
            </div>`
        ).join('');

        const moreErrors = errors.length > 20 ? `<p><em>... y ${errors.length - 20} errores más</em></p>` : '';

        const content = `
            <div style="max-height: 400px; overflow-y: auto;">
                <p>Se encontraron ${errors.length} errores durante el procesamiento:</p>
                ${errorList}
                ${moreErrors}
            </div>
            <style>
                .error-item {
                    padding: 0.5rem;
                    margin: 0.5rem 0;
                    background: #fef2f2;
                    border-left: 3px solid #dc2626;
                    border-radius: 0.25rem;
                }
                .error-item small {
                    color: #6b7280;
                    font-family: monospace;
                }
            </style>
        `;

        this.ui.showModal('Errores de procesamiento', content);
    }

    /**
     * Analiza los datos procesados
     * @param {Array} data - Datos del CSV
     */
    analyzeData(data) {
        try {
            // Crear analizador con los datos
            this.dataAnalyzer = new DataAnalyzer(data);
            this.currentData = data;

            // Obtener estadísticas generales
            const stats = this.dataAnalyzer.getStats();
            
            // Activar modo compacto de la interfaz
            this.activateCompactMode();
            
            // Actualizar UI
            this.ui.updateSummaryCards(stats);
            this.showAnalysisSection();
            
            // Aplicar filtros iniciales (mostrar todos)
            this.applyCurrentFilters();
            
            this.ui.showNotification('Análisis completado', 'success');
            
        } catch (error) {
            console.error('Error analizando datos:', error);
            this.ui.showNotification(`Error en el análisis: ${error.message}`, 'error');
        }
    }

    /**
     * Muestra las secciones de análisis
     */
    showAnalysisSection() {
        this.ui.toggleSection('summarySection', true);
        this.ui.toggleSection('filtersSection', true);
        this.ui.toggleSection('resultsSection', true);
    }

    /**
     * Configura los filtros
     */
    setupFilters() {
        const resetButton = document.getElementById('resetFilters');

        resetButton?.addEventListener('click', () => {
            this.resetFilters();
        });

        // Aplicar filtros en tiempo real con debounce
        const nameFilter = document.getElementById('nameFilter');
        const platesThreshold = document.getElementById('platesThreshold');
        const dateRange = document.getElementById('dateRange');
        const seasonFilter = document.getElementById('seasonFilter');

        // Debounce para el filtro de texto
        let nameFilterTimeout;
        nameFilter?.addEventListener('input', () => {
            clearTimeout(nameFilterTimeout);
            nameFilterTimeout = setTimeout(() => this.applyCurrentFilters(), 300);
        });

        // Eventos inmediatos para otros filtros
        [platesThreshold, dateRange, seasonFilter].forEach(input => {
            if (input) {
                input.addEventListener('change', () => {
                    this.applyCurrentFilters();
                });
            }
        });
    }

    /**
     * Aplica los filtros actuales
     */
    applyCurrentFilters() {
        if (!this.currentData) return;

        try {
            const filters = this.getCurrentFilters();
            let filteredData;

            // Obtener datos base
            let baseData = this.dataAnalyzer.getGroupedBySocio();

            // Aplicar filtros de forma acumulativa
            if (filters.dateRangeDays) {
                baseData = this.dataAnalyzer.filterSociosByMatriculasInPeriod(
                    filters.minPlates,
                    filters.dateRangeDays
                );
            }

            if (filters.matriculaType && filters.matriculaType !== 'all') {
                if (filters.dateRangeDays) {
                    // Aplicar filtro de tipo sobre datos ya filtrados por período
                    baseData = this.applyMatriculaTypeFilterToData(baseData, filters.matriculaType);
                } else {
                    // Aplicar filtro de tipo directamente
                    baseData = this.dataAnalyzer.filterSociosByMatriculaType(
                        filters.matriculaType, 
                        filters.dateRangeDays
                    );
                }
            }

            if (filters.season && filters.season !== 'all') {
                if (filters.dateRangeDays || (filters.matriculaType && filters.matriculaType !== 'all')) {
                    // Aplicar filtro de temporada sobre datos ya filtrados
                    baseData = this.applySeasonFilterToData(baseData, filters.season);
                } else {
                    // Aplicar filtro de temporada directamente
                    baseData = this.dataAnalyzer.filterSociosBySeason(
                        filters.season,
                        filters.minPlates
                    );
                }
            }

            // Aplicar filtro final de número mínimo de matrículas
            filteredData = baseData.filter(group => {
                const totalMatriculas = group.matriculas ? group.matriculas.length : 
                                      (group.totalMatriculas || 0);
                return totalMatriculas >= filters.minPlates;
            }).map(group => ({
                ...group,
                matriculasDetalle: group.matriculas || group.matriculasDetalle || []
            }));

            // Aplicar filtro de búsqueda por nombre
            if (filters.nameSearch) {
                filteredData = filteredData.filter(group => {
                    const socioName = (group.socio || '').toLowerCase();
                    return socioName.includes(filters.nameSearch);
                });
            }
            
            this.ui.renderTable(filteredData);
            
            // Mostrar mensaje si no hay resultados
            if (filteredData.length === 0) {
                this.ui.showNotification('No se encontraron resultados con los filtros aplicados', 'warning');
            } else {
                const message = `Mostrando ${filteredData.length} resultado(s) con los filtros aplicados`;
                this.ui.showNotification(message, 'info', 3000);
            }
            
        } catch (error) {
            console.error('Error aplicando filtros:', error);
            this.ui.showNotification('Error aplicando filtros', 'error');
        }
    }

    /**
     * Obtiene los filtros actuales de la UI
     * @returns {Object} Filtros
     */
    getCurrentFilters() {
        const nameFilter = document.getElementById('nameFilter');
        const platesThreshold = document.getElementById('platesThreshold');
        const dateRange = document.getElementById('dateRange');
        const seasonFilter = document.getElementById('seasonFilter');
        const matriculaTypeFilter = document.getElementById('matriculaTypeFilter');

        return {
            nameSearch: nameFilter ? nameFilter.value.toLowerCase().trim() : '',
            minPlates: platesThreshold ? parseInt(platesThreshold.value) || 1 : 1,
            dateRangeDays: dateRange && dateRange.value !== 'all' ? parseInt(dateRange.value) : null,
            season: seasonFilter ? seasonFilter.value : 'all',
            matriculaType: matriculaTypeFilter ? matriculaTypeFilter.value : 'all'
        };
    }

    /**
     * Resetea todos los filtros
     */
    resetFilters() {
        const nameFilter = document.getElementById('nameFilter');
        const platesThreshold = document.getElementById('platesThreshold');
        const dateRange = document.getElementById('dateRange');
        const seasonFilter = document.getElementById('seasonFilter');

        if (nameFilter) nameFilter.value = '';
        if (platesThreshold) platesThreshold.value = 5;
        if (dateRange) dateRange.value = 'all';
        if (seasonFilter) seasonFilter.value = 'all';

        this.applyCurrentFilters();
        this.ui.showNotification('Filtros reiniciados', 'info', 2000);
    }

    /**
     * Configura la funcionalidad de exportación
     */
    setupExport() {
        const exportButton = document.getElementById('exportResults');
        
        exportButton?.addEventListener('click', () => {
            this.exportResults();
        });
    }

    /**
     * Exporta los resultados actuales
     */
    exportResults() {
        if (!this.ui.filteredData || this.ui.filteredData.length === 0) {
            this.ui.showNotification('No hay datos para exportar', 'warning');
            return;
        }

        try {
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '_');
            const filename = `salions_analisis_${timestamp}.csv`;
            
            this.dataAnalyzer.exportToCSV(this.ui.filteredData, filename);
            this.ui.showNotification(`Archivo exportado: ${filename}`, 'success');
            
        } catch (error) {
            console.error('Error exportando datos:', error);
            this.ui.showNotification('Error exportando los datos', 'error');
        }
    }

    /**
     * Busca miembros sospechosos con muchas matrículas
     */
    findSuspiciousMembers() {
        if (!this.currentData) {
            this.ui.showNotification('No hay datos cargados', 'warning');
            return;
        }

        try {
            const suspicious = this.dataAnalyzer.findSuspiciousMembers({
                minPlates: 8,
                shortDuration: 30,
                overlappingPeriods: true
            });

            if (suspicious.length === 0) {
                this.ui.showNotification('No se encontraron patrones sospechosos', 'info');
                return;
            }

            const suspiciousList = suspicious.map(member => 
                `<div class="suspicious-member">
                    <h4>${member.member}</h4>
                    <p><strong>${member.platesCount} matrículas</strong></p>
                    <ul>
                        ${member.issues.map(issue => `<li>${issue}</li>`).join('')}
                    </ul>
                    <p><small>Severidad: ${member.severity}</small></p>
                </div>`
            ).join('');

            const content = `
                <div style="max-height: 500px; overflow-y: auto;">
                    <p>Se encontraron <strong>${suspicious.length}</strong> socios con patrones sospechosos:</p>
                    ${suspiciousList}
                </div>
                <style>
                    .suspicious-member {
                        padding: 1rem;
                        margin: 1rem 0;
                        background: #fef3c7;
                        border-left: 4px solid #f59e0b;
                        border-radius: 0.25rem;
                    }
                    .suspicious-member h4 {
                        margin: 0 0 0.5rem 0;
                        color: #92400e;
                    }
                    .suspicious-member ul {
                        margin: 0.5rem 0;
                        padding-left: 1.5rem;
                    }
                </style>
            `;

            this.ui.showModal('Análisis de socios sospechosos', content);

        } catch (error) {
            console.error('Error buscando socios sospechosos:', error);
            this.ui.showNotification('Error en el análisis de socios sospechosos', 'error');
        }
    }

    /**
     * Añade funcionalidad adicional de análisis
     */
    addAnalysisButton() {
        const resultsHeader = document.querySelector('.results-actions');
        if (resultsHeader && !document.getElementById('analyzeButton')) {
            const button = document.createElement('button');
            button.id = 'analyzeButton';
            button.className = 'btn-secondary';
            button.innerHTML = '🔍 Detectar abusos';
            button.addEventListener('click', () => this.findSuspiciousMembers());
            resultsHeader.appendChild(button);
        }
    }

    /**
     * Activa el modo compacto de la interfaz después de cargar datos
     */
    activateCompactMode() {
        // Agregar clase compacta al header con transición
        const header = document.querySelector('.header');
        if (header) {
            // Usar un pequeño delay para que la transición sea visible
            setTimeout(() => {
                header.classList.add('compact');
            }, 100);
        }

        // Ocultar la sección de upload con animación
        const uploadSection = document.querySelector('.upload-section');
        if (uploadSection) {
            setTimeout(() => {
                uploadSection.classList.add('hidden');
                
                // Después de la transición, ocultar completamente
                setTimeout(() => {
                    uploadSection.style.display = 'none';
                }, 600); // Coincide con la duración de la transición CSS
            }, 200);
        }

        // Hacer que la información del archivo sea más compacta
        const fileInfo = document.getElementById('fileInfo');
        if (fileInfo && fileInfo.style.display !== 'none') {
            setTimeout(() => {
                fileInfo.classList.add('compact');
            }, 300);
        }
    }

    /**
     * Aplica filtro de tipo de matrícula sobre datos ya filtrados
     * @param {Array} data - Datos ya filtrados
     * @param {string} tipo - Tipo de matrícula ('temporal' o 'permanente')
     * @returns {Array} Datos filtrados
     */
    applyMatriculaTypeFilterToData(data, tipo) {
        return data.map(group => {
            const matriculasFiltradas = group.matriculas.filter(m => m.tipoMatricula === tipo);
            
            if (matriculasFiltradas.length === 0) return null;

            // Recalcular todas las estadísticas para las matrículas filtradas
            const temporalesFiltradas = matriculasFiltradas.filter(m => m.tipoMatricula === 'temporal');
            const permanentesFiltradas = matriculasFiltradas.filter(m => m.tipoMatricula === 'permanente');
            
            // Recalcular estadísticas avanzadas
            const diasPromedio = this.dataAnalyzer.calculateAveragePermitDays(temporalesFiltradas);
            const frecuencia = this.dataAnalyzer.calculateSeasonalFrequency(matriculasFiltradas);
            const permisosCortos = this.dataAnalyzer.countShortPermits(matriculasFiltradas);
            const solapamientos = this.dataAnalyzer.countOverlappingPlates(matriculasFiltradas);
            const peakData = this.dataAnalyzer.findPeakSimultaneous(matriculasFiltradas);

            return {
                ...group,
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
                picoDetalle: peakData.details
            };
        }).filter(group => group !== null);
    }

    /**
     * Aplica filtro de temporada sobre datos ya filtrados
     * @param {Array} data - Datos ya filtrados
     * @param {string} season - Temporada ('verano' o 'invierno')
     * @returns {Array} Datos filtrados
     */
    applySeasonFilterToData(data, season) {
        return data.map(group => {
            const matriculasFiltradas = group.matriculas.filter(m => {
                if (!m.fechaInicio) return false;
                const mes = m.fechaInicio.getMonth() + 1; // 1-12
                return season === 'verano' ? TEMPORADAS.isVerano(mes) : TEMPORADAS.isInvierno(mes);
            });
            
            if (matriculasFiltradas.length === 0) return null;

            // Recalcular estadísticas básicas
            const temporalesFiltradas = matriculasFiltradas.filter(m => m.tipoMatricula === 'temporal');
            const permanentesFiltradas = matriculasFiltradas.filter(m => m.tipoMatricula === 'permanente');

            // Recalcular estadísticas avanzadas
            const diasPromedio = this.dataAnalyzer.calculateAveragePermitDays(temporalesFiltradas);
            
            // Para frecuencia estacional, cuando ya filtramos por temporada, 
            // solo mostrar la temporada filtrada
            const frecuencia = {
                verano: season === 'verano' ? this.calculateMonthlyFrequency(matriculasFiltradas) : 0,
                invierno: season === 'invierno' ? this.calculateMonthlyFrequency(matriculasFiltradas) : 0
            };
            
            const permisosCortos = this.dataAnalyzer.countShortPermits(matriculasFiltradas);
            const solapamientos = this.dataAnalyzer.countOverlappingPlates(matriculasFiltradas);
            const peakData = this.dataAnalyzer.findPeakSimultaneous(matriculasFiltradas);

            return {
                ...group,
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
                picoDetalle: peakData.details
            };
        }).filter(group => group !== null);
    }

    /**
     * Calcula la frecuencia mensual para un conjunto de matrículas
     * @param {Array} matriculas - Array de matrículas
     * @returns {number} Promedio mensual
     */
    calculateMonthlyFrequency(matriculas) {
        if (matriculas.length === 0) return 0;

        const registrosPorMes = new Map();
        
        matriculas.forEach(m => {
            if (m.fechaInicio) {
                const yearMonth = `${m.fechaInicio.getFullYear()}-${m.fechaInicio.getMonth()}`;
                registrosPorMes.set(yearMonth, (registrosPorMes.get(yearMonth) || 0) + 1);
            }
        });

        if (registrosPorMes.size === 0) return 0;
        
        const totalRegistros = Array.from(registrosPorMes.values()).reduce((sum, count) => sum + count, 0);
        return Math.round((totalRegistros / registrosPorMes.size) * 10) / 10;
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const app = new SalionsApp();
    
    // Hacer la app accesible globalmente para debugging
    window.salionsApp = app;
    
    // Añadir botón de análisis cuando se muestren resultados
    const observer = new MutationObserver(() => {
        if (document.getElementById('resultsSection').style.display !== 'none') {
            app.addAnalysisButton();
        }
    });
    
    const resultsSection = document.getElementById('resultsSection');
    if (resultsSection) {
        observer.observe(resultsSection, { attributes: true, attributeFilter: ['style'] });
    }
});

// Manejar errores globales
window.addEventListener('error', (e) => {
    console.error('Error global:', e.error);
    if (window.salionsApp) {
        window.salionsApp.ui.showNotification('Se produjo un error inesperado', 'error');
    }
});

// Prevenir comportamiento por defecto del drag and drop en toda la página
window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => e.preventDefault());
