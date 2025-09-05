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
            
            // Inicializar fechas por defecto
            this.initializeDateFilters();
            
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
        const dateFrom = document.getElementById('dateFrom');
        const dateTo = document.getElementById('dateTo');
        const seasonFilter = document.getElementById('seasonFilter');

        // Debounce para el filtro de texto
        let nameFilterTimeout;
        nameFilter?.addEventListener('input', () => {
            clearTimeout(nameFilterTimeout);
            nameFilterTimeout = setTimeout(() => this.applyCurrentFilters(), 300);
        });

        // Eventos inmediatos para otros filtros
        [platesThreshold, dateFrom, dateTo, seasonFilter].forEach(input => {
            if (input) {
                input.addEventListener('change', () => {
                        this.applyCurrentFilters();
                });
            }
        });

        // Configurar botones de acceso rápido para fechas
        this.setupDateQuickButtons();
    }

    /**
     * Inicializa los filtros de fecha con valores por defecto
     */
    initializeDateFilters() {
        // Establecer rango completo por defecto
        this.setDateRange('all');
        
        // Activar el botón "Todo"
        const allButton = document.querySelector('.btn-date-quick[data-days="all"]');
        if (allButton) allButton.classList.add('active');
    }

    /**
     * Configura los botones de acceso rápido para las fechas
     */
    setupDateQuickButtons() {
        const quickButtons = document.querySelectorAll('.btn-date-quick');
        
        quickButtons.forEach(button => {
            button.addEventListener('click', () => {
                const days = button.dataset.days;
                this.setDateRange(days);
                
                // Actualizar estado visual de botones
                quickButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Aplicar filtros
                this.applyCurrentFilters();
            });
        });
    }

    /**
     * Establece el rango de fechas basado en los días especificados
     * @param {string|number} days - Número de días hacia atrás desde hoy, o 'all' para todo el rango
     */
    setDateRange(days) {
        const dateFrom = document.getElementById('dateFrom');
        const dateTo = document.getElementById('dateTo');
        
        if (!dateFrom || !dateTo) return;

        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        dateTo.value = todayStr;

        if (days === 'all') {
            // Establecer la fecha mínima disponible en los datos
            const minDate = this.getMinDateFromData();
            dateFrom.value = minDate;
        } else {
            // Calcular fecha hacia atrás
            const daysNum = parseInt(days);
            const fromDate = new Date(today.getTime() - (daysNum * 24 * 60 * 60 * 1000));
            dateFrom.value = fromDate.toISOString().split('T')[0];
        }
    }

    /**
     * Obtiene la fecha mínima de los datos cargados
     * @returns {string} Fecha en formato YYYY-MM-DD
     */
    getMinDateFromData() {
        if (!this.currentData || this.currentData.length === 0) {
            // Fecha por defecto si no hay datos
            return '1970-01-01';
        }

        let minDate = new Date();
        
        this.currentData.forEach(record => {
            if (record.fechaInicio && record.fechaInicio < minDate) {
                minDate = record.fechaInicio;
            }
        });

        return minDate.toISOString().split('T')[0];
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
            if (filters.dateFrom || filters.dateTo) {
                // Usar filtro de rango de fechas específico
                baseData = this.dataAnalyzer.filterSociosByDateRange(
                    filters.minPlates,
                    filters.dateFrom,
                    filters.dateTo
                );
            } else if (filters.dateRangeDays) {
                // Usar filtro de días hacia atrás (compatibilidad)
                baseData = this.dataAnalyzer.filterSociosByMatriculasInPeriod(
                    filters.minPlates,
                    filters.dateRangeDays
                );
            }

            if (filters.season && filters.season !== 'all') {
                if (filters.dateFrom || filters.dateTo || filters.dateRangeDays) {
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
            
            // Actualizar descripción de filtros
            this.updateFiltersDescription(filters);
            
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
        const dateFrom = document.getElementById('dateFrom');
        const dateTo = document.getElementById('dateTo');
        const seasonFilter = document.getElementById('seasonFilter');

        // Calcular dateRangeDays si hay fechas específicas
        let dateRangeDays = null;
        if (dateFrom?.value && dateTo?.value) {
            const fromDate = new Date(dateFrom.value);
            const toDate = new Date(dateTo.value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Si la fecha "hasta" es hoy, calcular días desde "desde"
            if (toDate.toDateString() === today.toDateString()) {
                const diffTime = today.getTime() - fromDate.getTime();
                dateRangeDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }
        }

        return {
            nameSearch: nameFilter ? nameFilter.value.toLowerCase().trim() : '',
            minPlates: platesThreshold ? parseInt(platesThreshold.value) || 1 : 1,
            dateRangeDays: dateRangeDays,
            dateFrom: dateFrom?.value ? new Date(dateFrom.value) : null,
            dateTo: dateTo?.value ? new Date(dateTo.value) : null,
            season: seasonFilter ? seasonFilter.value : 'all'
        };
    }

    /**
     * Resetea todos los filtros
     */
    resetFilters() {
        const nameFilter = document.getElementById('nameFilter');
        const platesThreshold = document.getElementById('platesThreshold');
        const dateFrom = document.getElementById('dateFrom');
        const dateTo = document.getElementById('dateTo');
        const seasonFilter = document.getElementById('seasonFilter');

        if (nameFilter) nameFilter.value = '';
        if (platesThreshold) platesThreshold.value = 5;
        if (seasonFilter) seasonFilter.value = 'all';

        // Resetear fechas a "todo el rango"
        this.setDateRange('all');

        // Quitar estado activo de botones
        document.querySelectorAll('.btn-date-quick').forEach(btn => btn.classList.remove('active'));
        const allButton = document.querySelector('.btn-date-quick[data-days="all"]');
        if (allButton) allButton.classList.add('active');

        this.applyCurrentFilters();
        this.ui.showNotification('Filtros reiniciados', 'info', 2000);
    }

    /**
     * Actualiza la descripción textual de los filtros aplicados
     * @param {Object} filters - Filtros aplicados
     */
    updateFiltersDescription(filters) {
        const filtersInfo = document.getElementById('filtersInfo');
        const filtersDescription = document.getElementById('filtersDescription');
        
        if (!filtersInfo || !filtersDescription) return;

        let description = "Filtrando los socios";

        // Filtro de búsqueda por nombre
        if (filters.nameSearch) {
            description += ` que contienen la palabra "${filters.nameSearch}",`;
        }

        // Filtro de número mínimo de matrículas
        if (filters.minPlates > 1) {
            description += ` con más de ${filters.minPlates} matrículas,`;
        } else {
            description += ` con al menos ${filters.minPlates} matrícula,`;
        }

        // Filtro de rango de fechas
        if (filters.dateFrom && filters.dateTo) {
            const fromStr = filters.dateFrom.toLocaleDateString('es-ES');
            const toStr = filters.dateTo.toLocaleDateString('es-ES');
            
            if (filters.dateRangeDays) {
                description += ` desde el ${fromStr} al ${toStr} (últimos ${filters.dateRangeDays} días),`;
            } else {
                description += ` desde el ${fromStr} al ${toStr},`;
            }
        } else if (filters.dateFrom) {
            description += ` desde el ${filters.dateFrom.toLocaleDateString('es-ES')},`;
        } else if (filters.dateTo) {
            description += ` hasta el ${filters.dateTo.toLocaleDateString('es-ES')},`;
        } else {
            description += " desde el inicio de los tiempos,";
        }

        // Filtro de temporada
        if (filters.season && filters.season !== 'all') {
            if (filters.season === 'verano') {
                description += " en temporada de verano";
            } else if (filters.season === 'invierno') {
                description += " en temporada de invierno";
            }
        } else {
            description += " en temporada de invierno y verano";
        }

        description += ".";

        filtersDescription.textContent = description;
        filtersInfo.style.display = 'block';
    }

    /**
     * Configura la funcionalidad de exportación
     */
    setupExport() {
        const exportButton = document.getElementById('exportResults');
        const printButton = document.getElementById('printResults');
        
        exportButton?.addEventListener('click', () => {
            this.exportResults();
        });

        printButton?.addEventListener('click', () => {
            this.printResults();
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
    /**
     * Imprime la tabla actual con formato optimizado para A4
     */
    printResults() {
        if (!this.ui.filteredData || this.ui.filteredData.length === 0) {
            this.ui.showNotification('No hay datos para imprimir', 'warning');
            return;
        }

        try {
            // Agregar fecha de impresión para el pie de página
            const resultsSection = document.getElementById('resultsSection');
            if (resultsSection) {
                const printDate = new Date().toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                resultsSection.setAttribute('data-print-date', printDate);
            }
            
            // Notificar al usuario
            this.ui.showNotification('Preparando vista de impresión completa...', 'info', 2000);
            
            // Guardar estado actual de paginación
            const originalPage = this.ui.currentPage;
            const originalItemsPerPage = this.ui.itemsPerPage;
            
            // Configurar para mostrar todos los elementos
            this.ui.itemsPerPage = this.ui.filteredData.length;
            this.ui.currentPage = 1;
            
            // Re-renderizar la tabla completa
            this.ui.renderCurrentPage();
            
            // Configurar eventos para después de la impresión
            const afterPrint = () => {
                // Restaurar configuración original
                this.ui.itemsPerPage = originalItemsPerPage;
                this.ui.currentPage = originalPage;
                this.ui.renderCurrentPage();
                this.ui.updatePagination();
                
                // Limpiar eventos
                window.removeEventListener('afterprint', afterPrint);
            };
            
            window.addEventListener('afterprint', afterPrint);
            
            // Pequeño delay para mostrar la notificación antes de abrir el diálogo
            setTimeout(() => {
                window.print();
            }, 500);
            
        } catch (error) {
            console.error('Error preparando impresión:', error);
            this.ui.showNotification('Error preparando la impresión', 'error');
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
