/**
 * Clase para manejar componentes de interfaz de usuario
 */
class UIComponents {
    constructor() {
        this.currentSort = { column: null, direction: 'asc' };
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.filteredData = [];
    }

    /**
     * Actualiza las tarjetas de resumen
     * @param {Object} stats - Estadísticas generales
     */
    updateSummaryCards(stats) {
        const elements = {
            totalRecords: document.getElementById('totalRecords'),
            totalMembers: document.getElementById('totalMembers'),
            totalPlates: document.getElementById('totalPlates'),
            avgPlatesPerMember: document.getElementById('avgPlatesPerMember')
        };

        if (elements.totalRecords) elements.totalRecords.textContent = stats.totalRecords.toLocaleString();
        if (elements.totalMembers) elements.totalMembers.textContent = stats.totalMembers.toLocaleString();
        if (elements.totalPlates) elements.totalPlates.textContent = stats.totalPlates.toLocaleString();
        if (elements.avgPlatesPerMember) elements.avgPlatesPerMember.textContent = stats.avgPlatesPerMember;
    }

    /**
     * Renderiza la tabla de resultados
     * @param {Array} data - Datos a mostrar
     */
    renderTable(data) {
        this.filteredData = data;
        this.currentPage = 1;
        this.renderCurrentPage();
        this.updatePagination();
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
                <td>${this.escapeHtml(row.member)}</td>
                <td>${row.platesCount}</td>
                <td>
                    <div class="plates-list">
                        ${row.plates.map(plate => `<span class="plate-badge">${plate}</span>`).join('')}
                    </div>
                </td>
                <td>${row.dateRange}</td>
                <td>
                    <span class="status-badge status-${row.status}">
                        ${row.status === 'active' ? '✅ Activo' : '❌ Expirado'}
                    </span>
                </td>
            </tr>
        `).join('');

        // Añadir estilos para las matrículas si no existen
        this.addPlateStyles();
    }

    /**
     * Añade estilos CSS para las matrículas dinámicamente
     */
    addPlateStyles() {
        if (!document.getElementById('dynamic-plate-styles')) {
            const style = document.createElement('style');
            style.id = 'dynamic-plate-styles';
            style.textContent = `
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
                case 'member':
                    valueA = a.member.toLowerCase();
                    valueB = b.member.toLowerCase();
                    break;
                case 'platesCount':
                    valueA = a.platesCount;
                    valueB = b.platesCount;
                    break;
                case 'plates':
                    valueA = a.plates.join(',').toLowerCase();
                    valueB = b.plates.join(',').toLowerCase();
                    break;
                case 'dateRange':
                    // Ordenar por fecha de inicio más temprana
                    valueA = a.records[0]?.fechaInicio || new Date(0);
                    valueB = b.records[0]?.fechaInicio || new Date(0);
                    break;
                case 'status':
                    valueA = a.status;
                    valueB = b.status;
                    break;
                default:
                    valueA = a[column];
                    valueB = b[column];
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
     * Actualiza los indicadores visuales de ordenación
     */
    updateSortIndicators() {
        // Limpiar todos los indicadores
        document.querySelectorAll('.sort-indicator').forEach(indicator => {
            indicator.classList.remove('active');
            indicator.textContent = '';
        });

        // Añadir indicador a la columna activa
        const activeHeader = document.querySelector(`th[data-sort="${this.currentSort.column}"] .sort-indicator`);
        if (activeHeader) {
            activeHeader.classList.add('active');
            activeHeader.textContent = this.currentSort.direction === 'asc' ? '↑' : '↓';
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
    showModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
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
