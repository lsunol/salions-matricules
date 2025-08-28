/**
 * Clase para procesar archivos CSV de matrículas (formato sin headers)
 */
class CSVParser {
    constructor() {
        this.data = [];
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
     * Procesa texto CSV sin headers (formato: matricula;info;fecha_inicio;fecha_fin)
     * @param {string} csvText - Texto CSV a procesar
     * @returns {Array} Datos procesados
     */
    parseCSVText(csvText) {
        this.data = [];
        this.errors = [];

        // Dividir en líneas y limpiar
        const lines = csvText.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
            throw new Error('El archivo CSV está vacío');
        }

        // Procesar cada línea como datos (no hay headers)
        for (let i = 0; i < lines.length; i++) {
            const lineData = this.parseLine(lines[i]);
            
            if (lineData.length >= 3) { // Al menos matrícula, info y fecha_inicio
                const record = this.createRecord(lineData, i + 1);
                if (record) {
                    this.data.push(record);
                }
            } else if (lineData.some(cell => cell.trim())) {
                // Solo registrar error si la línea no está completamente vacía
                this.errors.push({
                    line: i + 1,
                    error: `Número insuficiente de columnas (mínimo 3, encontradas: ${lineData.length})`,
                    data: lineData.join(';')
                });
            }
        }

        if (this.data.length === 0) {
            throw new Error('No se pudieron procesar datos válidos del archivo CSV');
        }

        return {
            data: this.data,
            errors: this.errors,
            totalLines: lines.length,
            validRecords: this.data.length
        };
    }

    /**
     * Parsea una línea CSV con separador ; y manejo de JSON
     * @param {string} line - Línea a procesar
     * @returns {Array} Array de campos
     */
    parseLine(line) {
        const fields = [];
        let current = '';
        let inQuotes = false;
        let braceCount = 0;
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
                    current += char; // Incluir las comillas en el resultado
                    i++;
                }
            } else if (char === '{' && inQuotes) {
                braceCount++;
                current += char;
                i++;
            } else if (char === '}' && inQuotes) {
                braceCount--;
                current += char;
                i++;
            } else if (char === ';' && !inQuotes && braceCount === 0) {
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
     * Crea un registro estructurado a partir de una línea de datos
     * Formato esperado: matricula;info;fecha_inicio;fecha_fin
     * @param {Array} lineData - Datos de la línea
     * @param {number} lineNumber - Número de línea para errores
     * @returns {Object|null} Registro estructurado o null si hay errores
     */
    createRecord(lineData, lineNumber) {
        try {
            const matricula = this.cleanPlate(lineData[0] || '');
            const infoField = lineData[1] || '';
            const fechaInicio = this.parseDate(lineData[2] || '');
            const fechaFin = lineData[3] ? this.parseDate(lineData[3]) : null;

            // Extraer información del socio del campo info
            const socioInfo = this.extractSocioInfo(infoField);

            const record = {
                matricula: matricula,
                fechaInicio: fechaInicio,
                fechaFin: fechaFin,
                socio: socioInfo.socio,
                usuario: socioInfo.usuario || '',
                nota: socioInfo.nota || '',
                tipoMatricula: this.determineMatriculaType(fechaInicio, fechaFin),
                lineNumber: lineNumber,
                rawInfo: infoField // Mantener info original para debug
            };

            // Validar campos obligatorios
            if (!record.matricula) {
                this.errors.push({
                    line: lineNumber,
                    error: 'Matrícula vacía',
                    data: lineData.join(';')
                });
                return null;
            }

            if (!record.socio) {
                this.errors.push({
                    line: lineNumber,
                    error: 'No se pudo extraer información del socio',
                    data: lineData.join(';')
                });
                return null;
            }

            // Validar fechas
            if (!record.fechaInicio) {
                // Usar fecha por defecto si no hay fecha de inicio
                record.fechaInicio = new Date();
            }

            return record;
        } catch (error) {
            this.errors.push({
                line: lineNumber,
                error: error.message,
                data: lineData.join(';')
            });
            return null;
        }
    }

    /**
     * Extrae información del socio del campo info (JSON o string)
     * @param {string} infoField - Campo de información
     * @returns {Object} Información extraída del socio
     */
    extractSocioInfo(infoField) {
        if (!infoField) {
            return { socio: '', usuario: '', nota: '' };
        }

        // Intentar parsear como JSON primero
        if (infoField.startsWith('"') && infoField.endsWith('"')) {
            try {
                const jsonStr = infoField.slice(1, -1); // Remover comillas externas
                const jsonData = JSON.parse(jsonStr);
                
                if (jsonData.note) {
                    // Extraer número de socio y nombre de la nota
                    const socioInfo = this.extractSocioFromNote(jsonData.note);
                    return {
                        socio: socioInfo,
                        usuario: jsonData.user || '',
                        nota: jsonData.note || ''
                    };
                }
            } catch (e) {
                // Si falla el parsing JSON, tratar como string
            }
        }

        // Tratar como string simple con formato: [numero]-APELLIDOS, NOMBRES
        const socioInfo = this.extractSocioFromNote(infoField);
        return {
            socio: socioInfo,
            usuario: '',
            nota: infoField
        };
    }

    /**
     * Extrae información del socio de una nota
     * @param {string} note - Nota que contiene info del socio
     * @returns {string} Información del socio
     */
    extractSocioFromNote(note) {
        if (!note) return '';

        // Buscar patrón [número]-APELLIDOS, NOMBRES
        const socioPattern = /(\d+)-([^,\[\]]+(?:,[^,\[\]]+)*)/;
        const match = note.match(socioPattern);
        
        if (match) {
            const numero = match[1];
            const nombre = match[2].trim();
            return `${numero}-${nombre}`;
        }

        // Si no encuentra el patrón estándar, usar la nota completa como identificador
        return note.trim();
    }

    /**
     * Determina si la matrícula es temporal o permanente
     * @param {Date} fechaInicio - Fecha de inicio
     * @param {Date} fechaFin - Fecha de fin
     * @returns {string} 'temporal' o 'permanente'
     */
    determineMatriculaType(fechaInicio, fechaFin) {
        if (!fechaFin) {
            return 'permanente';
        }

        if (!fechaInicio) {
            return 'temporal';
        }

        // Si hay fecha de fin y es futura o dentro de un rango razonable, es temporal
        const diffDays = (fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 3600 * 24);
        
        // Considerar temporal si la duración es menor a 365 días
        return diffDays <= 365 ? 'temporal' : 'permanente';
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
            .replace(/\s+/g, ''); // Eliminar espacios pero mantener caracteres especiales
    }

    /**
     * Parsea una fecha en formato GMT
     * @param {string} dateStr - Cadena de fecha
     * @returns {Date|null} Fecha parseada o null si es inválida
     */
    parseDate(dateStr) {
        if (!dateStr || typeof dateStr !== 'string') return null;
        
        const cleaned = dateStr.trim();
        if (!cleaned) return null;

        // Formato esperado: DD/MM/YYYY HH:MM:SSGMT
        const gmtPattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})GMT$/;
        const match = cleaned.match(gmtPattern);
        
        if (match) {
            const [, day, month, year, hour, minute, second] = match;
            const date = new Date(
                parseInt(year), 
                parseInt(month) - 1, 
                parseInt(day),
                parseInt(hour),
                parseInt(minute),
                parseInt(second)
            );
            
            // Validar que la fecha sea válida
            if (date.getFullYear() == year && 
                date.getMonth() == month - 1 && 
                date.getDate() == day) {
                return date;
            }
        }

        // Formatos adicionales de respaldo
        const backupFormats = [
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,  // DD/MM/YYYY
            /^(\d{1,2})-(\d{1,2})-(\d{4})$/,   // DD-MM-YYYY
            /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,  // YYYY/MM/DD
            /^(\d{4})-(\d{1,2})-(\d{1,2})$/    // YYYY-MM-DD
        ];

        for (const format of backupFormats) {
            const match = cleaned.match(format);
            if (match) {
                let day, month, year;
                
                if (format.source.startsWith('^(\\d{4})')) {
                    [, year, month, day] = match;
                } else {
                    [, day, month, year] = match;
                }
                
                const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                
                if (date.getFullYear() == year && 
                    date.getMonth() == month - 1 && 
                    date.getDate() == day) {
                    return date;
                }
            }
        }

        return null;
    }

    /**
     * Obtiene estadísticas del proceso de parsing
     * @returns {Object} Estadísticas
     */
    getStats() {
        const temporales = this.data.filter(r => r.tipoMatricula === 'temporal').length;
        const permanentes = this.data.filter(r => r.tipoMatricula === 'permanente').length;
        
        return {
            totalRecords: this.data.length,
            totalErrors: this.errors.length,
            errorRate: this.data.length > 0 ? (this.errors.length / (this.data.length + this.errors.length) * 100).toFixed(2) : 0,
            matriculasTemporales: temporales,
            matriculasPermanentes: permanentes
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
