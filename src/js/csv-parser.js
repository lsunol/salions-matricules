/**
 * Clase para procesar archivos CSV de matrículas
 */
class CSVParser {
    constructor() {
        this.data = [];
        this.headers = [];
        this.errors = [];
    }

    /**
     * Procesa un archivo CSV
     * @param {File} file - Archivo CSV a procesar
     * @returns {Promise<Array>} Datos procesados
     */
    async parseFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    const parsed = this.parseCSVText(text);
                    resolve(parsed);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Error al leer el archivo'));
            };
            
            reader.readAsText(file, 'UTF-8');
        });
    }

    /**
     * Procesa texto CSV
     * @param {string} csvText - Texto CSV a procesar
     * @returns {Array} Datos procesados
     */
    parseCSVText(csvText) {
        this.data = [];
        this.headers = [];
        this.errors = [];

        // Dividir en líneas y limpiar
        const lines = csvText.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
            throw new Error('El archivo CSV está vacío');
        }

        // Procesar cabeceras
        this.headers = this.parseLine(lines[0]);
        this.validateHeaders();

        // Procesar datos
        for (let i = 1; i < lines.length; i++) {
            const lineData = this.parseLine(lines[i]);
            
            if (lineData.length === this.headers.length) {
                const record = this.createRecord(lineData, i + 1);
                if (record) {
                    this.data.push(record);
                }
            } else if (lineData.some(cell => cell.trim())) {
                // Solo registrar error si la línea no está completamente vacía
                this.errors.push({
                    line: i + 1,
                    error: `Número incorrecto de columnas (esperadas: ${this.headers.length}, encontradas: ${lineData.length})`,
                    data: lineData.join(',')
                });
            }
        }

        if (this.data.length === 0) {
            throw new Error('No se pudieron procesar datos válidos del archivo CSV');
        }

        return {
            data: this.data,
            headers: this.headers,
            errors: this.errors,
            totalLines: lines.length - 1,
            validRecords: this.data.length
        };
    }

    /**
     * Parsea una línea CSV teniendo en cuenta comillas y comas
     * @param {string} line - Línea a procesar
     * @returns {Array} Array de campos
     */
    parseLine(line) {
        const fields = [];
        let current = '';
        let inQuotes = false;
        let i = 0;

        while (i < line.length) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Comilla escapada
                    current += '"';
                    i += 2;
                } else {
                    // Inicio o fin de comillas
                    inQuotes = !inQuotes;
                    i++;
                }
            } else if (char === ',' && !inQuotes) {
                // Separador de campo
                fields.push(current.trim());
                current = '';
                i++;
            } else {
                current += char;
                i++;
            }
        }

        // Agregar el último campo
        fields.push(current.trim());

        return fields;
    }

    /**
     * Valida que las cabeceras contengan los campos esperados
     */
    validateHeaders() {
        const requiredFields = ['matricula', 'fecha_inicio', 'fecha_fin', 'socio'];
        const lowerHeaders = this.headers.map(h => h.toLowerCase().trim());
        
        // Mapear posibles variaciones de nombres de columna
        const fieldMappings = {
            'matricula': ['matricula', 'matrícula', 'placa', 'plate', 'license_plate'],
            'fecha_inicio': ['fecha_inicio', 'fecha inicio', 'start_date', 'inicio', 'from'],
            'fecha_fin': ['fecha_fin', 'fecha fin', 'end_date', 'fin', 'to', 'hasta'],
            'socio': ['socio', 'member', 'miembro', 'peticionario', 'solicitante', 'nombre']
        };

        this.columnMapping = {};
        
        for (const [field, variations] of Object.entries(fieldMappings)) {
            const foundIndex = lowerHeaders.findIndex(header => 
                variations.some(variation => header.includes(variation))
            );
            
            if (foundIndex === -1) {
                throw new Error(`No se encontró la columna requerida: ${field}. Columnas disponibles: ${this.headers.join(', ')}`);
            }
            
            this.columnMapping[field] = foundIndex;
        }
    }

    /**
     * Crea un registro estructurado a partir de una línea de datos
     * @param {Array} lineData - Datos de la línea
     * @param {number} lineNumber - Número de línea para errores
     * @returns {Object|null} Registro estructurado o null si hay errores
     */
    createRecord(lineData, lineNumber) {
        try {
            const record = {
                matricula: this.cleanPlate(lineData[this.columnMapping.matricula]),
                fechaInicio: this.parseDate(lineData[this.columnMapping.fecha_inicio]),
                fechaFin: this.parseDate(lineData[this.columnMapping.fecha_fin]),
                socio: this.cleanMemberName(lineData[this.columnMapping.socio]),
                lineNumber: lineNumber
            };

            // Validar campos obligatorios
            if (!record.matricula || !record.socio) {
                this.errors.push({
                    line: lineNumber,
                    error: 'Matrícula o socio vacío',
                    data: lineData.join(',')
                });
                return null;
            }

            // Validar fechas
            if (!record.fechaInicio && !record.fechaFin) {
                this.errors.push({
                    line: lineNumber,
                    error: 'Al menos una fecha debe ser válida',
                    data: lineData.join(',')
                });
                return null;
            }

            return record;
        } catch (error) {
            this.errors.push({
                line: lineNumber,
                error: error.message,
                data: lineData.join(',')
            });
            return null;
        }
    }

    /**
     * Limpia y normaliza una matrícula
     * @param {string} plate - Matrícula a limpiar
     * @returns {string} Matrícula normalizada
     */
    cleanPlate(plate) {
        if (!plate || typeof plate !== 'string') return '';
        
        return plate
            .trim()
            .toUpperCase()
            .replace(/\s+/g, '')  // Eliminar espacios
            .replace(/[^A-Z0-9]/g, ''); // Mantener solo letras y números
    }

    /**
     * Limpia y normaliza el nombre del socio
     * @param {string} memberName - Nombre del socio
     * @returns {string} Nombre normalizado
     */
    cleanMemberName(memberName) {
        if (!memberName || typeof memberName !== 'string') return '';
        
        return memberName
            .trim()
            .replace(/\s+/g, ' ')  // Normalizar espacios
            .toLowerCase()
            .replace(/\b\w/g, l => l.toUpperCase()); // Capitalizar primera letra de cada palabra
    }

    /**
     * Parsea una fecha en varios formatos posibles
     * @param {string} dateStr - Cadena de fecha
     * @returns {Date|null} Fecha parseada o null si es inválida
     */
    parseDate(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') return null;
        
        const cleaned = dateStr.trim();
        if (!cleaned) return null;

        // Formatos soportados
        const formats = [
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,  // DD/MM/YYYY
            /^(\d{1,2})-(\d{1,2})-(\d{4})$/,   // DD-MM-YYYY
            /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,  // YYYY/MM/DD
            /^(\d{4})-(\d{1,2})-(\d{1,2})$/    // YYYY-MM-DD
        ];

        for (const format of formats) {
            const match = cleaned.match(format);
            if (match) {
                let day, month, year;
                
                if (format.source.startsWith('^(\\d{4})')) {
                    // Formato YYYY-MM-DD o YYYY/MM/DD
                    [, year, month, day] = match;
                } else {
                    // Formato DD-MM-YYYY o DD/MM/YYYY
                    [, day, month, year] = match;
                }
                
                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                
                // Validar que la fecha sea válida
                if (date.getFullYear() == year && 
                    date.getMonth() == month - 1 && 
                    date.getDate() == day) {
                    return date;
                }
            }
        }

        // Intentar parsing directo de JavaScript como último recurso
        const jsDate = new Date(cleaned);
        if (!isNaN(jsDate.getTime())) {
            return jsDate;
        }

        return null;
    }

    /**
     * Obtiene estadísticas del proceso de parsing
     * @returns {Object} Estadísticas
     */
    getStats() {
        return {
            totalRecords: this.data.length,
            totalErrors: this.errors.length,
            errorRate: this.data.length > 0 ? (this.errors.length / (this.data.length + this.errors.length) * 100).toFixed(2) : 0,
            headers: this.headers,
            columnMapping: this.columnMapping
        };
    }

    /**
     * Obtiene los errores encontrados durante el parsing
     * @returns {Array} Lista de errores
     */
    getErrors() {
        return this.errors;
    }
}
