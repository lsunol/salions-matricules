/**
 * Clase para manejar componentes de interfaz de usuario
 */
class UIComponents {
    constructor() {
        this.currentSort = { column: 'totalMatriculas', direction: 'desc' };
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.filteredData = [];
        
        // Exponer la instancia globalmente para los event handlers
        window.uiComponents = this;
    }

    /**
     * Genera tooltips para iconos de temporadas
     * @param {string} tipo - 'verano' o 'invierno'
     * @returns {string} Tooltip text
     */
    static getSeasonTooltip(tipo) {
        if (tipo === 'verano') {
            return 'Verano: de Junio a Septiembre';
        } else if (tipo === 'invierno') {
            return 'Invierno: de Octubre a Mayo';
        }
        return '';
    }

    /**
     * Actualiza las tarjetas de resumen
     * @param {Object} stats - Estadísticas generales
     */
    updateSummaryCards(stats) {
        const elements = {
            totalRecords: document.getElementById('totalRecords'),
            totalMembers: document.getElementById('totalMembers'),
            dailyRegistrations: document.getElementById('dailyRegistrations'),
            dailyRegistrationsDetail: document.getElementById('dailyRegistrationsDetail'),
            avgPlatesPerMember: document.getElementById('avgPlatesPerMember')
        };

        // Mapear las propiedades del nuevo formato de stats
        if (elements.totalRecords) elements.totalRecords.textContent = stats.totalMatriculas.toLocaleString();
        if (elements.totalMembers) elements.totalMembers.textContent = stats.totalSocios.toLocaleString();
        
        // Mostrar altas al día
        if (elements.dailyRegistrations && stats.altasAlDia) {
            elements.dailyRegistrations.textContent = stats.altasAlDia.promedio.toString().replace('.', ',');
        }
        if (elements.dailyRegistrationsDetail && stats.altasAlDia) {
            // Crear HTML con tooltips para los iconos de temporadas
            const veranoValue = stats.altasAlDia.verano.toString().replace('.', ',');
            const inviernoValue = stats.altasAlDia.invierno.toString().replace('.', ',');
            
            elements.dailyRegistrationsDetail.innerHTML = `
                <span title="${UIComponents.getSeasonTooltip('verano')}">☀️</span> ${veranoValue} / 
                <span title="${UIComponents.getSeasonTooltip('invierno')}">❄️</span> ${inviernoValue}
            `;
        }
        
        // Calcular promedio de matrículas por socio
        const avgPlates = stats.totalSocios > 0 ? (stats.totalMatriculas / stats.totalSocios).toFixed(1) : '0';
        if (elements.avgPlatesPerMember) elements.avgPlatesPerMember.textContent = avgPlates;
    }

    /**
     * Renderiza la tabla de resultados
     * @param {Array} data - Datos a mostrar
     */
    renderTable(data) {
        this.filteredData = data;
        this.currentPage = 1;
        
        // Aplicar ordenación inicial si hay datos
        if (this.filteredData.length > 0) {
            this.sortTableData();
        }
        
        this.renderCurrentPage();
        this.updatePagination();
        this.updateSortIndicators();
    }

    /**
     * Renderiza la página actual de la tabla
     */
    renderCurrentPage() {
        const tbody = document.getElementById('resultsTableBody');
        if (!tbody) return;

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageData = this.filteredData.slice(startIndex, endIndex);

        tbody.innerHTML = pageData.map(row => `
            <tr>
                <td class="socio-cell"><strong>${this.escapeHtml(row.socio || row.member)}</strong></td>
                <td>
                    <div class="matriculas-count">
                        <span class="total-badge">${row.totalMatriculas || (row.matriculas ? row.matriculas.length : 0)}</span>
                        ${row.temporales !== undefined ? `
                            <div class="tipo-breakdown">
                                <span class="matricula-badge matricula-temporal">T:${row.temporales}</span>
                                <span class="matricula-badge matricula-permanente">P:${row.permanentes}</span>
                            </div>
                        ` : ''}
                    </div>
                </td>
                <td class="centered-cell">
                    <span class="metric-value" title="Días promedio de permisos temporales">
                        ${row.diasPromedioPermiso ? `${row.diasPromedioPermiso.toString().replace('.', ',')} días` : '-'}
                    </span>
                </td>
                <td>
                    <div class="frequency-seasonal" title="Frecuencia mensual: Verano ☀️ (Jun-Sep) / Invierno ❄️ (Oct-May)">
                        ${this.formatSeasonalFrequency(row.frecuenciaEstacional)}
                    </div>
                </td>
                <td>
                    <span class="metric-badge ${row.permisosCortos > 5 ? 'metric-warning' : ''}" title="Permisos de 7 días o menos">
                        ${row.permisosCortos || 0}
                    </span>
                </td>
                <td>
                    <span class="metric-badge ${row.solapamientos > 3 ? 'metric-warning' : ''}" title="Solapamientos de matrículas activas">
                        ${row.solapamientos || 0}
                    </span>
                </td>
                <td>
                    <span class="metric-badge clickable-metric ${row.picoSimultaneo > 4 ? 'metric-warning' : ''}" 
                          title="Máximo de matrículas temporales activas simultáneamente - Clic para ver detalles"
                          onclick="window.uiComponents.showPicoSimultaneoModal('${this.escapeForAttribute(row.socio || row.member)}', '${this.generateRowId(row)}')">
                        ${row.picoSimultaneo || 0} 👁️
                    </span>
                </td>
                <td>
                    <div class="plates-list">
                        ${this.renderMatriculasList(row)}
                    </div>
                </td>
            </tr>
        `).join('');

        // Guardar datos para modales
        pageData.forEach(row => {
            const rowId = this.generateRowId(row);
            
            // Guardar datos de matrículas
            if (!window.platesData) window.platesData = {};
            let matriculas = [];
            if (row.matriculas && Array.isArray(row.matriculas)) {
                matriculas = row.matriculas;
            } else if (row.plates && Array.isArray(row.plates)) {
                matriculas = row.plates.map(plate => ({ matricula: plate }));
            } else if (row.matriculasDetalle && Array.isArray(row.matriculasDetalle)) {
                matriculas = row.matriculasDetalle;
            }
            window.platesData[rowId] = matriculas;
            
            // Guardar datos del pico simultáneo
            if (!window.picoData) window.picoData = {};
            window.picoData[rowId] = row.picoDetalle || null;
        });

        // Añadir estilos para las matrículas si no existen
        this.addPlateStyles();
        this.addMetricStyles();
    }

    /**
     * Renderiza la lista de matrículas con sus tipos
     * @param {Object} row - Fila de datos
     * @returns {string} HTML de la lista de matrículas
     */
    renderMatriculasList(row) {
        let matriculas = [];
        
        if (row.matriculas && Array.isArray(row.matriculas)) {
            matriculas = row.matriculas;
        } else if (row.plates && Array.isArray(row.plates)) {
            matriculas = row.plates.map(plate => ({ matricula: plate }));
        } else if (row.matriculasDetalle && Array.isArray(row.matriculasDetalle)) {
            matriculas = row.matriculasDetalle;
        }
        
        if (matriculas.length === 0) return '';
        
        const maxVisible = 5; // Mostrar solo 5 matrículas
        const visibleMatriculas = matriculas.slice(0, maxVisible);
        const totalMatriculas = matriculas.length;
        const rowId = this.generateRowId(row);
        
        // Renderizar matrículas visibles
        const visibleHtml = visibleMatriculas.map(matricula => 
            this.renderSinglePlate(matricula)
        ).join('');
        
        // Botón para ver todas en modal
        const viewAllButton = totalMatriculas > maxVisible ? `
            <button class="view-all-plates-btn" onclick="window.uiComponents.showPlatesModal('${rowId}', '${this.escapeForAttribute(row.socio || row.member)}')" 
                    title="Ver todas las ${totalMatriculas} matrículas">
                👁️ Ver todas (${totalMatriculas})
            </button>
        ` : '';
        
        return `
            <div class="plates-preview">
                ${visibleHtml}
                ${viewAllButton}
            </div>
        `;
    }

    /**
     * Renderiza una matrícula individual
     * @param {Object} matricula - Datos de la matrícula
     * @returns {string} HTML de la matrícula
     */
    renderSinglePlate(matricula) {
        const plateData = typeof matricula === 'string' ? { matricula } : matricula;
        const tipoClass = plateData.tipoMatricula ? `plate-${plateData.tipoMatricula}` : '';
        const tooltip = this.getMatriculaTooltip(plateData);
        
        return `<span class="plate-badge ${tipoClass}" title="${tooltip}">
            <span class="tipo-indicator ${plateData.tipoMatricula || 'unknown'}"></span>
            ${plateData.matricula}
        </span>`;
    }

    /**
     * Genera un ID único para la fila
     * @param {Object} row - Datos de la fila
     * @returns {string} ID único
     */
    generateRowId(row) {
        const socio = (row.socio || row.member || 'unknown').replace(/[^a-zA-Z0-9]/g, '');
        const hash = Math.abs(this.simpleHash(socio + (row.totalMatriculas || 0)));
        return `row-${hash}`;
    }

    /**
     * Función hash simple para generar IDs únicos
     * @param {string} str - Cadena a convertir en hash
     * @returns {number} Hash numérico
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convertir a 32bit integer
        }
        return hash;
    }

    /**
     * Escapa texto para usar como atributo HTML
     * @param {string} text - Texto a escapar
     * @returns {string} Texto escapado
     */
    escapeForAttribute(text) {
        return (text || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
    }

    /**
     * Muestra modal con todas las matrículas del socio
     * @param {string} rowId - ID de la fila
     * @param {string} socioName - Nombre del socio
     */
    showPlatesModal(rowId, socioName) {
        const matriculas = window.platesData?.[rowId] || [];
        if (matriculas.length === 0) return;
        
        // Ordenar matrículas: primero permanentes, luego temporales, por fecha de inicio
        const sortedMatriculas = [...matriculas].sort((a, b) => {
            // Primero por tipo: permanentes primero
            const tipoA = a.tipoMatricula || 'unknown';
            const tipoB = b.tipoMatricula || 'unknown';
            
            if (tipoA === 'permanente' && tipoB !== 'permanente') return -1;
            if (tipoA !== 'permanente' && tipoB === 'permanente') return 1;
            
            // Dentro del mismo tipo, ordenar por fecha de inicio
            const fechaA = a.fechaInicio || new Date(0);
            const fechaB = b.fechaInicio || new Date(0);
            
            return fechaB - fechaA; // Más recientes primero
        });
        
        // Agrupar por tipo para mostrar
        const permanentes = sortedMatriculas.filter(m => m.tipoMatricula === 'permanente');
        const temporales = sortedMatriculas.filter(m => m.tipoMatricula === 'temporal' || !m.tipoMatricula);
        
        const content = `
            <div class="plates-modal-content-large">
                <!-- Header fijo -->
                <div class="plates-modal-header">
                    <div class="plates-summary-compact">
                        <span><strong>Total:</strong> ${matriculas.length} matrículas</span>
                        <span><strong>Permanentes:</strong> ${permanentes.length}</span>
                        <span><strong>Temporales:</strong> ${temporales.length}</span>
                    </div>
                </div>
                
                <!-- Contenido scrolleable -->
                <div class="plates-modal-scrollable">
                    ${permanentes.length > 0 ? `
                        <div class="plates-section">
                            <h4 class="section-title">🟢 Matrículas Permanentes (${permanentes.length})</h4>
                            <div class="plates-compact-grid">
                                ${permanentes.map(m => this.renderCompactPlate(m, 'permanente')).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${temporales.length > 0 ? `
                        <div class="plates-section">
                            <h4 class="section-title">🟡 Matrículas Temporales (${temporales.length})</h4>
                            <div class="plates-compact-grid">
                                ${temporales.map(m => this.renderCompactPlate(m, 'temporal')).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
                
                <!-- Footer fijo -->
                <div class="plates-modal-footer">
                    <button class="copy-plates-btn" onclick="window.uiComponents.copyPlatestoClipboard('${rowId}')">
                        📋 Copiar lista al portapapeles
                    </button>
                </div>
            </div>
            
            <style>
                .plates-modal-content-large {
                    max-width: 1200px;
                    height: 80vh;
                    display: flex;
                    flex-direction: column;
                    /* Removemos max-height y overflow-y para evitar doble scroll */
                    padding: 0;
                }
                
                .plates-modal-header {
                    flex-shrink: 0;
                    padding: 1rem;
                    background: white;
                    border-bottom: 1px solid #e5e7eb;
                    border-radius: 0.5rem 0.5rem 0 0;
                }
                
                .plates-modal-scrollable {
                    flex: 1;
                    overflow-y: auto;
                    padding: 1rem;
                    background: #f9fafb;
                }
                
                .plates-modal-footer {
                    flex-shrink: 0;
                    padding: 1rem;
                    background: white;
                    border-top: 1px solid #e5e7eb;
                    border-radius: 0 0 0.5rem 0.5rem;
                    text-align: center;
                }
                
                .plates-summary-compact {
                    background: #f8fafc;
                    padding: 1rem;
                    border-radius: 0.5rem;
                    border-left: 4px solid #3b82f6;
                    display: flex;
                    justify-content: space-around;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 1rem;
                    text-align: center;
                    margin: 0;
                }
                
                .plates-summary-compact span {
                    color: #374151;
                    font-size: 0.95rem;
                }
                
                .plates-section {
                    margin-bottom: 2rem;
                }
                
                .section-title {
                    font-size: 1.1rem;
                    font-weight: 600;
                    margin-bottom: 1rem;
                    padding-bottom: 0.5rem;
                    border-bottom: 2px solid #e5e7eb;
                    color: #374151;
                }
                
                .plates-compact-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 0.5rem;
                    background: #f9fafb;
                    padding: 1rem;
                    border-radius: 0.5rem;
                    border: 1px solid #e5e7eb;
                }
                
                .compact-plate-item {
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 0.375rem;
                    padding: 0.5rem 0.75rem;
                    font-family: 'Segoe UI', system-ui, sans-serif;
                    font-size: 0.875rem;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .compact-plate-item:hover {
                    border-color: #3b82f6;
                    box-shadow: 0 1px 3px rgba(59, 130, 246, 0.1);
                    transform: translateY(-1px);
                }
                
                .compact-plate-permanente {
                    border-left: 3px solid #10b981;
                    background: linear-gradient(135deg, #ffffff, #f0fdf4);
                }
                
                .compact-plate-temporal {
                    border-left: 3px solid #f59e0b;
                    background: linear-gradient(135deg, #ffffff, #fffbeb);
                }
                
                .plate-number-compact {
                    font-family: 'Courier New', monospace;
                    font-weight: 700;
                    color: #1f2937;
                    min-width: 80px;
                }
                
                .plate-dates-compact {
                    color: #6b7280;
                    flex-grow: 1;
                }
                
                .plate-user-compact {
                    color: #6b7280;
                    font-style: italic;
                    font-size: 0.8rem;
                }
                
                .copy-plates-btn {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 0.5rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                
                .copy-plates-btn:hover {
                    background: linear-gradient(135deg, #059669, #047857);
                    transform: translateY(-1px);
                }
                
                @media (max-width: 768px) {
                    .plates-modal-content-large {
                        max-width: 95vw;
                        height: 85vh;
                    }
                    
                    .plates-modal-header,
                    .plates-modal-footer {
                        padding: 0.75rem;
                    }
                    
                    .plates-modal-scrollable {
                        padding: 0.75rem;
                    }
                    
                    .plates-compact-grid {
                        grid-template-columns: 1fr;
                        gap: 0.375rem;
                    }
                    
                    .plates-summary-compact {
                        flex-direction: column;
                        gap: 0.5rem;
                        padding: 0.75rem;
                    }
                }
            </style>
        `;
        
        this.showModal(`Matrículas de ${socioName}`, content, 'large-modal');
    }

    /**
     * Formatea una fecha con ceros a la izquierda para consistencia visual
     * @param {Date} date - Fecha a formatear
     * @returns {string} Fecha formateada (DD/MM/YYYY)
     */
    formatDateWithPadding(date) {
        if (!date) return '-';
        
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}/${month}/${year}`;
    }

    /**
     * Renderiza una matrícula en formato compacto
     * @param {Object} matricula - Datos de la matrícula
     * @param {string} tipo - 'permanente' o 'temporal'
     * @returns {string} HTML de la matrícula compacta
     */
    renderCompactPlate(matricula, tipo) {
        const fechaInicio = matricula.fechaInicio ? this.formatDateWithPadding(matricula.fechaInicio) : '-';
        const usuario = matricula.usuario || 'Sin especificar';
        
        let fechasText = '';
        if (tipo === 'permanente') {
            // Formato: MATRICULA fecha (usuario)
            fechasText = fechaInicio;
        } else {
            // Formato: MATRICULA fecha_inicio - fecha_fin (usuario)
            const fechaFin = matricula.fechaFin ? this.formatDateWithPadding(matricula.fechaFin) : 'Sin límite';
            fechasText = `${fechaInicio} - ${fechaFin}`;
        }
        
        return `
            <div class="compact-plate-item compact-plate-${tipo}">
                <span class="plate-number-compact">${matricula.matricula}</span>
                <span class="plate-dates-compact">${fechasText}</span>
                <span class="plate-user-compact">(${usuario})</span>
            </div>
        `;
    }

    /**
     * Renderiza una matrícula con detalles completos
     * @param {Object} matricula - Datos de la matrícula
     * @returns {string} HTML de la matrícula detallada
     */
    renderDetailedPlate(matricula) {
        const tipoClass = matricula.tipoMatricula === 'permanente' ? 'plate-type-permanente' : 'plate-type-temporal';
        const tipoText = matricula.tipoMatricula === 'permanente' ? 'Permanente' : 'Temporal';
        
        const fechaInicio = matricula.fechaInicio ? this.formatDateWithPadding(matricula.fechaInicio) : 'No especificada';
        const fechaFin = matricula.fechaFin ? this.formatDateWithPadding(matricula.fechaFin) : 'Sin límite';
        const usuario = matricula.usuario || 'No especificado';
        
        return `
            <div class="detailed-plate">
                <div class="plate-header">
                    <span class="plate-number">${matricula.matricula}</span>
                    <span class="plate-type-badge ${tipoClass}">${tipoText}</span>
                </div>
                <div class="plate-details">
                    <div><strong>Inicio:</strong> ${fechaInicio}</div>
                    <div><strong>Fin:</strong> ${fechaFin}</div>
                    <div><strong>Usuario:</strong> ${usuario}</div>
                </div>
            </div>
        `;
    }

    /**
     * Copia la lista de matrículas al portapapeles
     * @param {string} rowId - ID de la fila
     */
    async copyPlatestoClipboard(rowId) {
        const matriculas = window.platesData?.[rowId] || [];
        if (matriculas.length === 0) return;
        
        // Crear texto para copiar
        const permanentes = matriculas.filter(m => m.tipoMatricula === 'permanente');
        const temporales = matriculas.filter(m => m.tipoMatricula === 'temporal' || !m.tipoMatricula);
        
        let texto = `Lista de Matrículas (Total: ${matriculas.length})\n`;
        texto += `Permanentes: ${permanentes.length} | Temporales: ${temporales.length}\n\n`;
        
        if (permanentes.length > 0) {
            texto += `MATRÍCULAS PERMANENTES (${permanentes.length}):\n`;
            texto += `${'='.repeat(40)}\n`;
            permanentes.forEach(m => {
                const inicio = m.fechaInicio ? m.fechaInicio.toLocaleDateString('es-ES') : 'No especificada';
                const fin = m.fechaFin ? m.fechaFin.toLocaleDateString('es-ES') : 'Sin límite';
                texto += `${m.matricula} | Inicio: ${inicio} | Fin: ${fin}\n`;
            });
            texto += '\n';
        }
        
        if (temporales.length > 0) {
            texto += `MATRÍCULAS TEMPORALES (${temporales.length}):\n`;
            texto += `${'='.repeat(40)}\n`;
            temporales.forEach(m => {
                const inicio = m.fechaInicio ? m.fechaInicio.toLocaleDateString('es-ES') : 'No especificada';
                const fin = m.fechaFin ? m.fechaFin.toLocaleDateString('es-ES') : 'Sin límite';
                texto += `${m.matricula} | Inicio: ${inicio} | Fin: ${fin}\n`;
            });
        }
        
        try {
            await navigator.clipboard.writeText(texto);
            this.showNotification('Lista copiada al portapapeles', 'success', 2000);
        } catch (err) {
            // Fallback para navegadores que no soportan clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = texto;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showNotification('Lista copiada al portapapeles', 'success', 2000);
        }
    }

    /**
     * Muestra modal con detalles del pico simultáneo
     * @param {string} socioName - Nombre del socio
     * @param {string} rowId - ID de la fila para obtener los datos
     */
    showPicoSimultaneoModal(socioName, rowId) {
        const picoDetalle = window.picoData?.[rowId];
        
        if (!picoDetalle || !picoDetalle.fecha) {
            this.showModal(`Pico Simultáneo - ${socioName}`, `
                <div class="pico-modal-content">
                    <p>No hay información detallada disponible sobre el pico simultáneo para este socio.</p>
                </div>
            `);
            return;
        }

        const fecha = new Date(picoDetalle.fecha).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const matriculas = picoDetalle.matriculas || [];
        const matriculasHtml = matriculas.length > 0 ? 
            matriculas.map(m => `<span class="matricula-item">${m}</span>`).join('') :
            '<span class="no-data">No hay información de matrículas</span>';

        const content = `
            <div class="pico-modal-content">
                <div class="pico-summary">
                    <h4>📊 Resumen del Pico Simultáneo (Solo Temporales)</h4>
                    <div class="pico-info">
                        <div class="info-item">
                            <strong>Máximo simultáneo:</strong> ${matriculas.length} matrículas temporales
                        </div>
                        <div class="info-item">
                            <strong>Fecha del pico:</strong> ${fecha}
                        </div>
                    </div>
                </div>
                
                ${matriculas.length > 0 ? `
                    <div class="matriculas-section">
                        <h4>🚗 Matrículas Temporales Activas en el Pico</h4>
                        <div class="matriculas-grid">
                            ${matriculasHtml}
                        </div>
                    </div>
                ` : ''}
                
                <div class="pico-note">
                    <p><strong>Nota:</strong> Este pico representa el momento en que el socio tuvo el mayor número de matrículas temporales activas simultáneamente. Las matrículas permanentes no se incluyen en este cálculo.</p>
                </div>
            </div>
            
            <style>
                .pico-modal-content {
                    max-width: 600px;
                    max-height: 70vh;
                    overflow-y: auto;
                }
                .pico-summary {
                    background: #f8fafc;
                    padding: 1.5rem;
                    border-radius: 0.5rem;
                    margin-bottom: 1.5rem;
                    border-left: 4px solid #3b82f6;
                }
                .pico-summary h4 {
                    margin: 0 0 1rem 0;
                    color: #1f2937;
                    font-size: 1.1rem;
                }
                .pico-info {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                .info-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.95rem;
                    color: #374151;
                }
                .matriculas-section {
                    margin-bottom: 1.5rem;
                }
                .matriculas-section h4 {
                    font-size: 1rem;
                    margin-bottom: 1rem;
                    color: #374151;
                    border-bottom: 2px solid #e5e7eb;
                    padding-bottom: 0.5rem;
                }
                .matriculas-grid {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }
                .matricula-item {
                    background: #dbeafe;
                    color: #1e40af;
                    padding: 0.375rem 0.75rem;
                    border-radius: 0.375rem;
                    font-family: monospace;
                    font-weight: 600;
                    font-size: 0.875rem;
                    border: 1px solid #93c5fd;
                }
                .no-data {
                    color: #6b7280;
                    font-style: italic;
                }
                .pico-note {
                    background: #fffbeb;
                    border: 1px solid #fed7aa;
                    border-radius: 0.5rem;
                    padding: 1rem;
                    margin-top: 1rem;
                }
                .pico-note p {
                    margin: 0;
                    color: #92400e;
                    font-size: 0.875rem;
                    line-height: 1.5;
                }
            </style>
        `;

        this.showModal(`Pico Simultáneo - ${socioName}`, content);
    }

    /**
     * Genera tooltip para una matrícula
     * @param {Object} matricula - Datos de la matrícula
     * @returns {string} Texto del tooltip
     */
    getMatriculaTooltip(matricula) {
        const parts = [];
        if (matricula.tipoMatricula) {
            parts.push(`Tipo: ${matricula.tipoMatricula}`);
        }
        if (matricula.fechaInicio) {
            parts.push(`Inicio: ${matricula.fechaInicio.toLocaleDateString('es-ES')}`);
        }
        if (matricula.fechaFin) {
            parts.push(`Fin: ${matricula.fechaFin.toLocaleDateString('es-ES')}`);
        }
        if (matricula.usuario) {
            parts.push(`Usuario: ${matricula.usuario}`);
        }
        return parts.join(' | ');
    }

    /**
     * Formatea la frecuencia estacional
     * @param {Object} frecuencia - Objeto con frecuencias de verano e invierno
     * @returns {string} Frecuencia formateada
     */
    formatSeasonalFrequency(frecuencia) {
        if (!frecuencia) return '-';
        
        const verano = frecuencia.verano || 0;
        const invierno = frecuencia.invierno || 0;
        
        return `
            <div class="seasonal-freq">
                <div class="freq-winter" title="${UIComponents.getSeasonTooltip('invierno')}">${invierno} <span title="${UIComponents.getSeasonTooltip('invierno')}">❄️</span></div>
                <div class="freq-summer" title="${UIComponents.getSeasonTooltip('verano')}">${verano} <span title="${UIComponents.getSeasonTooltip('verano')}">☀️</span></div>
            </div>
        `;
    }

    /**
     * Formatea el rango de fechas
     * @param {Object} row - Fila de datos
     * @returns {string} Rango de fechas formateado
     */
    formatDateRange(row) {
        if (row.dateRange) {
            return row.dateRange;
        }
        if (row.fechaUltimoRegistro) {
            return `Último: ${row.fechaUltimoRegistro.toLocaleDateString('es-ES')}`;
        }
        return 'Sin fecha';
    }

    /**
     * Obtiene el estado de la fila
     * @param {Object} row - Fila de datos
     * @returns {string} Estado de la fila
     */
    getRowStatus(row) {
        if (row.status) {
            return row.status;
        }
        if (row.matriculas && row.matriculas.some(m => this.isMatriculaActive(m))) {
            return 'active';
        }
        return 'expired';
    }

    /**
     * Obtiene el texto del estado
     * @param {Object} row - Fila de datos
     * @returns {string} Texto del estado
     */
    getStatusText(row) {
        const status = this.getRowStatus(row);
        return status === 'active' ? '✅ Activo' : '❌ Expirado';
    }

    /**
     * Verifica si una matrícula está activa
     * @param {Object} matricula - Datos de la matrícula
     * @returns {boolean} True si está activa
     */
    isMatriculaActive(matricula) {
        const now = new Date();
        if (!matricula.fechaFin) {
            return true; // Permanente sin fecha de fin
        }
        return matricula.fechaFin >= now;
    }

    /**
     * Añade estilos CSS para las matrículas dinámicamente
     */
    addPlateStyles() {
        if (!document.getElementById('dynamic-plate-styles')) {
            const style = document.createElement('style');
            style.id = 'dynamic-plate-styles';
            style.textContent = `
                .plates-preview {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 0.25rem;
                }
                .plates-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.25rem;
                }
                .plate-badge {
                    background-color: #f1f5f9;
                    color: #475569;
                    padding: 0.125rem 0.375rem;
                    border-radius: 0.25rem;
                    font-size: 0.75rem;
                    font-family: monospace;
                    font-weight: 600;
                    white-space: nowrap;
                }
                .view-all-plates-btn {
                    background: linear-gradient(135deg, #6366f1, #4f46e5);
                    color: white;
                    border: none;
                    padding: 0.25rem 0.5rem;
                    border-radius: 0.375rem;
                    font-size: 0.75rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                    margin-left: 0.25rem;
                }
                .view-all-plates-btn:hover {
                    background: linear-gradient(135deg, #4f46e5, #4338ca);
                    transform: translateY(-1px);
                    box-shadow: 0 2px 4px rgba(79, 70, 229, 0.3);
                }
                .view-all-plates-btn:active {
                    transform: translateY(0);
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Añade estilos CSS para las métricas dinámicamente
     */
    addMetricStyles() {
        if (!document.getElementById('metric-styles')) {
            const style = document.createElement('style');
            style.id = 'metric-styles';
            style.textContent = `
                .metric-value {
                    font-weight: 600;
                    color: #374151;
                }
                .metric-badge {
                    display: inline-block;
                    padding: 0.25rem 0.5rem;
                    border-radius: 0.375rem;
                    font-size: 0.875rem;
                    font-weight: 600;
                    background-color: #f3f4f6;
                    color: #374151;
                    text-align: center;
                    min-width: 2rem;
                }
                .metric-badge.metric-warning {
                    background-color: #fef3c7;
                    color: #92400e;
                    border: 1px solid #fed7aa;
                }
                .metric-badge.clickable-metric {
                    cursor: pointer;
                    transition: all 0.2s ease;
                    user-select: none;
                }
                .metric-badge.clickable-metric:hover {
                    background-color: var(--primary-color, #3b82f6);
                    color: white;
                    transform: translateY(-1px);
                    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
                }
                .seasonal-freq {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.125rem;
                    font-size: 0.875rem;
                    line-height: 1.2;
                }
                .freq-summer {
                    color: #ea580c;
                    font-weight: 600;
                }
                .freq-winter {
                    color: #0ea5e9;
                    font-weight: 600;
                }
                .frequency-seasonal {
                    min-width: 3rem;
                    text-align: center;
                }
                .matriculas-count {
                    text-align: center;
                }
                .tipo-breakdown {
                    display: flex;
                    gap: 0.25rem;
                    justify-content: center;
                    margin-top: 0.25rem;
                }
                .matricula-badge {
                    font-size: 0.75rem;
                    padding: 0.125rem 0.25rem;
                    border-radius: 0.25rem;
                    font-weight: 500;
                }
                .matricula-temporal {
                    background-color: var(--warning-bg, #fef3c7);
                    color: #92400e;
                }
                .matricula-permanente {
                    background-color: var(--success-bg, #dcfce7);
                    color: #166534;
                }
                .total-badge {
                    display: inline-block;
                    padding: 0.25rem 0.5rem;
                    border-radius: 0.375rem;
                    font-size: 0.875rem;
                    font-weight: 600;
                    background-color: #e0e7ff;
                    color: #3730a3;
                    border: 1px solid #c7d2fe;
                    text-align: center;
                    min-width: 2rem;
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Configura el sistema de ordenación de la tabla
     */
    setupTableSorting() {
        const headers = document.querySelectorAll('.results-table th[data-sort]');
        
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const column = header.dataset.sort;
                this.sortTable(column);
            });
        });
        
        // Inicializar indicadores por primera vez
        this.updateSortIndicators();
    }

    /**
     * Ordena la tabla por una columna específica
     * @param {string} column - Columna por la que ordenar
     */
    sortTable(column) {
        // Cambiar dirección si es la misma columna
        if (this.currentSort.column === column) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.column = column;
            this.currentSort.direction = 'asc';
        }

        // Aplicar ordenación
        this.filteredData.sort((a, b) => {
            let valueA, valueB;

            switch (column) {
                case 'socio':
                    valueA = (a.socio || a.member || '').toLowerCase();
                    valueB = (b.socio || b.member || '').toLowerCase();
                    break;
                case 'totalMatriculas':
                    valueA = a.totalMatriculas || (a.matriculas ? a.matriculas.length : 0);
                    valueB = b.totalMatriculas || (b.matriculas ? b.matriculas.length : 0);
                    break;
                case 'diasPromedioPermiso':
                    valueA = a.diasPromedioPermiso || 0;
                    valueB = b.diasPromedioPermiso || 0;
                    break;
                case 'frecuenciaEstacional':
                    // Ordenar por la suma de verano + invierno
                    valueA = (a.frecuenciaEstacional?.verano || 0) + (a.frecuenciaEstacional?.invierno || 0);
                    valueB = (b.frecuenciaEstacional?.verano || 0) + (b.frecuenciaEstacional?.invierno || 0);
                    break;
                case 'permisosCortos':
                    valueA = a.permisosCortos || 0;
                    valueB = b.permisosCortos || 0;
                    break;
                case 'solapamientos':
                    valueA = a.solapamientos || 0;
                    valueB = b.solapamientos || 0;
                    break;
                case 'picoSimultaneo':
                    valueA = a.picoSimultaneo || 0;
                    valueB = b.picoSimultaneo || 0;
                    break;
                case 'matriculas':
                    // Ordenar por número de matrículas
                    valueA = a.matriculas ? a.matriculas.length : 0;
                    valueB = b.matriculas ? b.matriculas.length : 0;
                    break;
                // Columnas antiguas para retrocompatibilidad
                case 'member':
                    valueA = a.member?.toLowerCase() || '';
                    valueB = b.member?.toLowerCase() || '';
                    break;
                case 'platesCount':
                    valueA = a.platesCount || 0;
                    valueB = b.platesCount || 0;
                    break;
                case 'plates':
                    valueA = a.plates ? a.plates.join(',').toLowerCase() : '';
                    valueB = b.plates ? b.plates.join(',').toLowerCase() : '';
                    break;
                case 'dateRange':
                    // Ordenar por fecha de inicio más temprana
                    valueA = a.records?.[0]?.fechaInicio || new Date(0);
                    valueB = b.records?.[0]?.fechaInicio || new Date(0);
                    break;
                case 'status':
                    valueA = a.status || '';
                    valueB = b.status || '';
                    break;
                default:
                    valueA = a[column] || 0;
                    valueB = b[column] || 0;
            }

            let comparison = 0;
            if (valueA > valueB) comparison = 1;
            if (valueA < valueB) comparison = -1;

            return this.currentSort.direction === 'desc' ? -comparison : comparison;
        });

        // Actualizar indicadores visuales
        this.updateSortIndicators();
        
        // Re-renderizar
        this.currentPage = 1;
        this.renderCurrentPage();
        this.updatePagination();
    }

    /**
     * Aplica la ordenación actual a los datos sin cambiar la configuración
     */
    sortTableData() {
        if (!this.currentSort.column) return;
        
        this.filteredData.sort((a, b) => {
            let valueA, valueB;

            switch (this.currentSort.column) {
                case 'socio':
                    valueA = (a.socio || a.member || '').toLowerCase();
                    valueB = (b.socio || b.member || '').toLowerCase();
                    break;
                case 'totalMatriculas':
                    valueA = a.totalMatriculas || (a.matriculas ? a.matriculas.length : 0);
                    valueB = b.totalMatriculas || (b.matriculas ? b.matriculas.length : 0);
                    break;
                case 'diasPromedioPermiso':
                    valueA = a.diasPromedioPermiso || 0;
                    valueB = b.diasPromedioPermiso || 0;
                    break;
                case 'frecuenciaEstacional':
                    valueA = (a.frecuenciaEstacional?.verano || 0) + (a.frecuenciaEstacional?.invierno || 0);
                    valueB = (b.frecuenciaEstacional?.verano || 0) + (b.frecuenciaEstacional?.invierno || 0);
                    break;
                case 'permisosCortos':
                    valueA = a.permisosCortos || 0;
                    valueB = b.permisosCortos || 0;
                    break;
                case 'solapamientos':
                    valueA = a.solapamientos || 0;
                    valueB = b.solapamientos || 0;
                    break;
                case 'picoSimultaneo':
                    valueA = a.picoSimultaneo || 0;
                    valueB = b.picoSimultaneo || 0;
                    break;
                case 'matriculas':
                    valueA = a.matriculas ? a.matriculas.length : 0;
                    valueB = b.matriculas ? b.matriculas.length : 0;
                    break;
                default:
                    valueA = a[this.currentSort.column] || 0;
                    valueB = b[this.currentSort.column] || 0;
            }

            let comparison = 0;
            if (valueA > valueB) comparison = 1;
            if (valueA < valueB) comparison = -1;

            return this.currentSort.direction === 'desc' ? -comparison : comparison;
        });
    }

    /**
     * Actualiza los indicadores visuales de ordenación
     */
    updateSortIndicators() {
        // Establecer iconos por defecto para todas las columnas
        document.querySelectorAll('.sort-indicator').forEach(indicator => {
            indicator.classList.remove('active');
            indicator.textContent = '⇅'; // Icono de ordenación por defecto
        });

        // Añadir indicador a la columna activa
        if (this.currentSort.column) {
            const activeHeader = document.querySelector(`th[data-sort="${this.currentSort.column}"] .sort-indicator`);
            if (activeHeader) {
                activeHeader.classList.add('active');
                activeHeader.textContent = this.currentSort.direction === 'asc' ? '↑' : '↓';
            }
        }
    }

    /**
     * Configura el sistema de paginación
     */
    setupPagination() {
        const prevButton = document.getElementById('prevPage');
        const nextButton = document.getElementById('nextPage');

        if (prevButton) {
            prevButton.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.renderCurrentPage();
                    this.updatePagination();
                }
            });
        }

        if (nextButton) {
            nextButton.addEventListener('click', () => {
                const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
                if (this.currentPage < totalPages) {
                    this.currentPage++;
                    this.renderCurrentPage();
                    this.updatePagination();
                }
            });
        }
    }

    /**
     * Actualiza la información de paginación
     */
    updatePagination() {
        const totalPages = Math.ceil(this.filteredData.length / this.itemsPerPage);
        const startRecord = ((this.currentPage - 1) * this.itemsPerPage) + 1;
        const endRecord = Math.min(this.currentPage * this.itemsPerPage, this.filteredData.length);

        const pageInfo = document.getElementById('pageInfo');
        const prevButton = document.getElementById('prevPage');
        const nextButton = document.getElementById('nextPage');
        const pagination = document.getElementById('pagination');

        if (pageInfo) {
            pageInfo.textContent = `${startRecord}-${endRecord} de ${this.filteredData.length} registros (Página ${this.currentPage} de ${totalPages})`;
        }

        if (prevButton) {
            prevButton.disabled = this.currentPage === 1;
        }

        if (nextButton) {
            nextButton.disabled = this.currentPage === totalPages;
        }

        // Mostrar/ocultar paginación según sea necesario
        if (pagination) {
            pagination.style.display = totalPages > 1 ? 'flex' : 'none';
        }
    }

    /**
     * Muestra mensajes de notificación al usuario
     * @param {string} message - Mensaje a mostrar
     * @param {string} type - Tipo de mensaje (success, error, warning, info)
     * @param {number} duration - Duración en milisegundos
     */
    showNotification(message, type = 'info', duration = 5000) {
        // Crear el elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${this.escapeHtml(message)}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        // Añadir estilos si no existen
        this.addNotificationStyles();

        // Añadir al DOM
        document.body.appendChild(notification);

        // Configurar cierre automático
        const closeButton = notification.querySelector('.notification-close');
        const autoClose = setTimeout(() => {
            this.removeNotification(notification);
        }, duration);

        // Configurar cierre manual
        closeButton.addEventListener('click', () => {
            clearTimeout(autoClose);
            this.removeNotification(notification);
        });

        // Animación de entrada
        setTimeout(() => {
            notification.classList.add('notification-show');
        }, 10);
    }

    /**
     * Obtiene el icono para un tipo de notificación
     * @param {string} type - Tipo de notificación
     * @returns {string} Icono
     */
    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }

    /**
     * Remueve una notificación del DOM
     * @param {HTMLElement} notification - Elemento de notificación
     */
    removeNotification(notification) {
        notification.classList.add('notification-hide');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    /**
     * Añade estilos CSS para las notificaciones dinámicamente
     */
    addNotificationStyles() {
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 10000;
                    min-width: 300px;
                    max-width: 500px;
                    border-radius: 0.5rem;
                    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
                    opacity: 0;
                    transform: translateX(100%);
                    transition: all 0.3s ease;
                }
                .notification-show {
                    opacity: 1;
                    transform: translateX(0);
                }
                .notification-hide {
                    opacity: 0;
                    transform: translateX(100%);
                }
                .notification-content {
                    display: flex;
                    align-items: center;
                    padding: 1rem;
                    gap: 0.75rem;
                }
                .notification-success {
                    background-color: #ecfdf5;
                    border: 1px solid #a7f3d0;
                    color: #065f46;
                }
                .notification-error {
                    background-color: #fef2f2;
                    border: 1px solid #fca5a5;
                    color: #991b1b;
                }
                .notification-warning {
                    background-color: #fffbeb;
                    border: 1px solid #fed7aa;
                    color: #92400e;
                }
                .notification-info {
                    background-color: #eff6ff;
                    border: 1px solid #93c5fd;
                    color: #1e40af;
                }
                .notification-message {
                    flex: 1;
                    font-weight: 500;
                }
                .notification-close {
                    background: none;
                    border: none;
                    font-size: 1.25rem;
                    cursor: pointer;
                    padding: 0;
                    opacity: 0.7;
                    transition: opacity 0.2s ease;
                }
                .notification-close:hover {
                    opacity: 1;
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Crea un modal para mostrar información detallada
     * @param {string} title - Título del modal
     * @param {string} content - Contenido del modal
     */
    showModal(title, content, modalClass = '') {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content ${modalClass}">
                <div class="modal-header">
                    <h3>${this.escapeHtml(title)}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;

        this.addModalStyles();
        document.body.appendChild(modal);

        // Configurar cierre
        const closeButton = modal.querySelector('.modal-close');
        const overlay = modal;

        const closeModal = () => {
            modal.classList.add('modal-hide');
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        };

        closeButton.addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });

        // Animación de entrada
        setTimeout(() => {
            modal.classList.add('modal-show');
        }, 10);
    }

    /**
     * Añade estilos CSS para los modales dinámicamente
     */
    addModalStyles() {
        if (!document.getElementById('modal-styles')) {
            const style = document.createElement('style');
            style.id = 'modal-styles';
            style.textContent = `
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.5);
                    z-index: 10000;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                .modal-show {
                    opacity: 1;
                }
                .modal-hide {
                    opacity: 0;
                }
                .modal-content {
                    background: white;
                    border-radius: 0.5rem;
                    max-width: 90vw;
                    max-height: 90vh;
                    overflow: auto;
                    box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
                    transform: scale(0.9);
                    transition: transform 0.3s ease;
                }
                .modal-show .modal-content {
                    transform: scale(1);
                }
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.5rem;
                    border-bottom: 1px solid #e2e8f0;
                }
                .modal-header h3 {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 600;
                }
                .modal-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    padding: 0;
                    color: #64748b;
                    transition: color 0.2s ease;
                }
                .modal-close:hover {
                    color: #1e293b;
                }
                .modal-body {
                    padding: 1.5rem;
                }
                
                /* Estilos especiales para modales grandes */
                .modal-content.large-modal {
                    max-width: 95vw;
                    max-height: 95vh;
                }
                
                @media (min-width: 1024px) {
                    .modal-content.large-modal {
                        max-width: 1200px;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Escapa caracteres HTML para evitar XSS
     * @param {string} text - Texto a escapar
     * @returns {string} Texto escapado
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Muestra/oculta secciones de la interfaz
     * @param {string} sectionId - ID de la sección
     * @param {boolean} show - Mostrar o ocultar
     */
    toggleSection(sectionId, show) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * Añade clase de loading a un elemento
     * @param {string|HTMLElement} element - Elemento o selector
     * @param {boolean} loading - Estado de carga
     */
    setLoading(element, loading) {
        const el = typeof element === 'string' ? document.querySelector(element) : element;
        if (el) {
            if (loading) {
                el.classList.add('loading');
                el.disabled = true;
            } else {
                el.classList.remove('loading');
                el.disabled = false;
            }
        }
    }
}
