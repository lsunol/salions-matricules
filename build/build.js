const fs = require('fs');
const path = require('path');

/**
 * Script para construir un archivo HTML único que incluya todo el CSS y JavaScript
 */
class BuildScript {
    constructor() {
        this.srcDir = path.join(__dirname, '..', 'src');
        this.distDir = path.join(__dirname, '..', 'dist');
        this.outputFile = path.join(this.distDir, 'salions-matricules.html');
    }

    /**
     * Ejecuta el proceso de build
     */
    async build() {
        console.log('🔨 Iniciando build de Salions Matrículas...');
        
        try {
            // Crear directorio de distribución si no existe
            this.ensureDistDir();
            
            // Leer archivo HTML base
            const htmlContent = this.readFile(path.join(this.srcDir, 'index.html'));
            
            // Leer y procesar CSS
            const cssContent = this.readFile(path.join(this.srcDir, 'css', 'styles.css'));
            
            // Leer y procesar JavaScript files
            const jsFiles = [
                'csv-parser.js',
                'data-analyzer.js',
                'ui-components.js',
                'app.js'
            ];
            
            const jsContent = jsFiles.map(file => 
                this.readFile(path.join(this.srcDir, 'js', file))
            ).join('\n\n');
            
            // Construir HTML final
            const finalHtml = this.buildFinalHtml(htmlContent, cssContent, jsContent);
            
            // Escribir archivo final
            fs.writeFileSync(this.outputFile, finalHtml, 'utf8');
            
            // Mostrar estadísticas
            this.showBuildStats(finalHtml);
            
            console.log('✅ Build completado exitosamente!');
            console.log(`📄 Archivo generado: ${this.outputFile}`);
            
        } catch (error) {
            console.error('❌ Error durante el build:', error.message);
            process.exit(1);
        }
    }

    /**
     * Asegura que el directorio de distribución existe
     */
    ensureDistDir() {
        if (!fs.existsSync(this.distDir)) {
            fs.mkdirSync(this.distDir, { recursive: true });
            console.log(`📁 Directorio creado: ${this.distDir}`);
        }
    }

    /**
     * Lee un archivo y devuelve su contenido
     * @param {string} filePath - Ruta del archivo
     * @returns {string} Contenido del archivo
     */
    readFile(filePath) {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Archivo no encontrado: ${filePath}`);
        }
        
        console.log(`📖 Leyendo: ${path.basename(filePath)}`);
        return fs.readFileSync(filePath, 'utf8');
    }

    /**
     * Construye el HTML final con CSS y JS embebidos
     * @param {string} htmlContent - Contenido HTML base
     * @param {string} cssContent - Contenido CSS
     * @param {string} jsContent - Contenido JavaScript
     * @returns {string} HTML final
     */
    buildFinalHtml(htmlContent, cssContent, jsContent) {
        // Añadir banner de información
        const banner = this.createBanner();
        
        // Minificar CSS (básico)
        const minifiedCSS = this.minifyCSS(cssContent);
        
        // Procesar JavaScript (añadir comentarios de sección)
        const processedJS = this.processJavaScript(jsContent);
        
        // Reemplazar links de CSS con CSS embebido
        let finalHtml = htmlContent.replace(
            /<link rel="stylesheet" href="css\/styles\.css">/,
            `<style>\n${minifiedCSS}\n    </style>`
        );
        
        // Reemplazar scripts con JavaScript embebido
        finalHtml = finalHtml.replace(
            /    <!-- Scripts -->\s*\n    <script src="js\/csv-parser\.js"><\/script>\s*\n    <script src="js\/data-analyzer\.js"><\/script>\s*\n    <script src="js\/ui-components\.js"><\/script>\s*\n    <script src="js\/app\.js"><\/script>/,
            `    <!-- Scripts embebidos -->\n    <script>\n${processedJS}\n    </script>`
        );
        
        // Añadir banner al inicio
        finalHtml = banner + finalHtml;
        
        return finalHtml;
    }

    /**
     * Crea un banner informativo para el archivo
     * @returns {string} Banner
     */
    createBanner() {
        const date = new Date().toISOString();
        return `<!--
🏘️ Salions Matrículas - Análisis de Accesos Vehiculares
Generado automáticamente el: ${date}

Esta aplicación permite analizar archivos CSV con datos de matrículas,
agrupándolos por socio y detectando posibles abusos del sistema.

Características:
- Procesamiento local de datos (sin envío a servidores)
- Filtros predefinidos y personalizables
- Detección automática de patrones sospechosos
- Exportación de resultados
- Interfaz responsiva y fácil de usar

Para usar: Abrir este archivo en cualquier navegador web moderno
-->\n\n`;
    }

    /**
     * Minifica CSS básicamente
     * @param {string} css - CSS a minificar
     * @returns {string} CSS minificado
     */
    minifyCSS(css) {
        return css
            // Mantener legibilidad en lugar de minificar agresivamente
            .replace(/\/\*[\s\S]*?\*\//g, '') // Eliminar comentarios
            .replace(/\s+/g, ' ') // Normalizar espacios
            .replace(/;\s*}/g, '}') // Eliminar punto y coma antes de llave de cierre
            .replace(/{\s*/g, '{') // Eliminar espacios después de llave de apertura
            .replace(/;\s*/g, ';') // Normalizar punto y coma
            .trim();
    }

    /**
     * Procesa JavaScript añadiendo comentarios de sección
     * @param {string} js - JavaScript a procesar
     * @returns {string} JavaScript procesado
     */
    processJavaScript(js) {
        // Añadir separadores entre archivos para mejor legibilidad
        const sections = [
            { pattern: /class CSVParser/, title: '=== PARSER CSV ===' },
            { pattern: /class DataAnalyzer/, title: '=== ANALIZADOR DE DATOS ===' },
            { pattern: /class UIComponents/, title: '=== COMPONENTES UI ===' },
            { pattern: /class SalionsApp/, title: '=== APLICACIÓN PRINCIPAL ===' }
        ];

        let processedJS = js;
        
        sections.forEach(section => {
            processedJS = processedJS.replace(
                section.pattern,
                `\n        // ${section.title}\n        ${section.pattern.source.replace(/[\\\/]/g, '')}`
            );
        });

        // Añadir espaciado para legibilidad
        return processedJS
            .split('\n')
            .map(line => '        ' + line) // Indentar para el <script>
            .join('\n');
    }

    /**
     * Muestra estadísticas del build
     * @param {string} finalHtml - HTML final generado
     */
    showBuildStats(finalHtml) {
        const stats = {
            size: finalHtml.length,
            lines: finalHtml.split('\n').length,
            sizeKB: (finalHtml.length / 1024).toFixed(2),
            sizeMB: (finalHtml.length / 1024 / 1024).toFixed(2)
        };

        console.log('\n📊 Estadísticas del build:');
        console.log(`   Tamaño: ${stats.sizeKB} KB (${stats.sizeMB} MB)`);
        console.log(`   Líneas: ${stats.lines.toLocaleString()}`);
        console.log(`   Caracteres: ${stats.size.toLocaleString()}`);
    }

    /**
     * Ejecuta una build de desarrollo (sin minificar)
     */
    async buildDev() {
        console.log('🔧 Build de desarrollo (sin minificar)...');
        
        // Similar al build normal pero sin minificar
        this.minifyCSS = (css) => css; // No minificar en dev
        
        await this.build();
    }
}

// Ejecutar script
const buildScript = new BuildScript();

// Detectar argumentos de línea de comandos
const args = process.argv.slice(2);
const isDev = args.includes('--dev') || args.includes('-d');

if (isDev) {
    buildScript.buildDev();
} else {
    buildScript.build();
}
