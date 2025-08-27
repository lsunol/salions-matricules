# 🏘️ Salions Matrículas

Aplicación web para análisis de permisos de acceso vehicular en la urbanización Salions.

## 📋 Descripción

Esta aplicación permite analizar archivos CSV que contienen información sobre matrículas de vehículos, fechas de permisos y socios peticionarios. Su objetivo principal es identificar patrones de uso y detectar posibles abusos del sistema de accesos.

## ✨ Características

- **💻 Procesamiento local**: Todos los datos se procesan en el navegador, sin envío a servidores
- **📊 Análisis automático**: Agrupación por socio y estadísticas detalladas
- **🔍 Filtros predefinidos**: Filtros por número de matrículas, fechas, temporadas
- **⚠️ Detección de abusos**: Identificación automática de patrones sospechosos
- **📤 Exportación**: Resultados exportables a CSV
- **📱 Responsive**: Interfaz adaptable a diferentes dispositivos
- **🎯 Sin dependencias**: Solo HTML, CSS y JavaScript vanilla

## 🚀 Uso Rápido

### Opción 1: Archivo único (Recomendado)
1. Ejecuta el build: `npm run build`
2. Abre el archivo `dist/salions-matricules.html` en tu navegador
3. ¡Listo para usar!

### Opción 2: Desarrollo
1. Instala las dependencias: `npm install`
2. Inicia el servidor de desarrollo: `npm run dev`
3. Abre `http://localhost:3000` en tu navegador

## 📁 Formato del CSV

El archivo CSV debe contener las siguientes columnas (nombres flexibles):

| Columna requerida | Variaciones aceptadas | Ejemplo |
|-------------------|----------------------|---------|
| **Matrícula** | matricula, matrícula, placa, plate | ABC1234 |
| **Fecha inicio** | fecha_inicio, fecha inicio, start_date | 15/01/2024 |
| **Fecha fin** | fecha_fin, fecha fin, end_date | 31/01/2024 |
| **Socio** | socio, member, peticionario, nombre | Juan Pérez |

### Ejemplo de CSV:
```csv
matricula,fecha_inicio,fecha_fin,socio
ABC1234,15/01/2024,31/01/2024,Juan Pérez
XYZ5678,01/02/2024,28/02/2024,María García
ABC1234,01/03/2024,15/03/2024,Juan Pérez
```

## 🔧 Desarrollo

### Estructura del proyecto
```
salions-matricules/
├── src/                    # Código fuente modular
│   ├── index.html         # HTML principal
│   ├── css/
│   │   └── styles.css     # Estilos CSS
│   └── js/
│       ├── csv-parser.js      # Parser de CSV
│       ├── data-analyzer.js   # Analizador de datos
│       ├── ui-components.js   # Componentes UI
│       └── app.js            # Aplicación principal
├── build/
│   └── build.js           # Script de construcción
├── dist/                  # Archivo final generado
└── package.json
```

### Scripts disponibles

```bash
# Desarrollo con live reload
npm run dev

# Build para producción
npm run build

# Build de desarrollo (sin minificar)
npm run build -- --dev

# Servir archivo construido
npm run serve
```

### Desarrollo de nuevas características

1. **Modifica los archivos en `src/`** - mantén la modularidad
2. **Ejecuta `npm run dev`** - para desarrollo con live reload
3. **Prueba con `npm run build`** - para generar el archivo final
4. **Verifica el resultado** - abre `dist/salions-matricules.html`

## 🎯 Funcionalidades principales

### 1. Carga de archivos
- **Drag & Drop**: Arrastra el CSV directamente a la aplicación
- **Selector de archivos**: Click para seleccionar archivo
- **Validación**: Verificación de formato y tamaño (máx. 10MB)

### 2. Análisis de datos
- **Estadísticas generales**: Total de registros, socios, matrículas
- **Agrupación por socio**: Vista consolidada por peticionario
- **Cálculo de períodos**: Duración y fechas de permisos
- **Estado actual**: Permisos activos vs. expirados

### 3. Filtros predefinidos
- **Por cantidad**: Socios con más de X matrículas
- **Por fecha**: Últimos 30/90/180/365 días
- **Por temporada**: Invierno, primavera, verano, otoño
- **Combinables**: Todos los filtros pueden aplicarse simultáneamente

### 4. Detección de abusos
- **Muchas matrículas**: Socios con cantidad excesiva
- **Períodos cortos**: Registros frecuentes de corta duración
- **Solapamientos**: Misma matrícula en períodos simultáneos
- **Puntuación de severidad**: Ranking de casos sospechosos

### 5. Exportación y reporting
- **CSV exportable**: Resultados filtrados descargables
- **Detalles de errores**: Información sobre problemas de parsing
- **Estadísticas completas**: Resumen del análisis realizado

## 🎨 Interfaz de usuario

- **🎨 Diseño moderno**: Interfaz limpia y profesional
- **📊 Visualización clara**: Tablas ordenables y responsive
- **🔔 Notificaciones**: Feedback claro para todas las acciones
- **⚡ Rendimiento**: Paginación automática para grandes datasets
- **🎯 Accesibilidad**: Navegación por teclado y lectores de pantalla

## 🔒 Privacidad y seguridad

- **🏠 Procesamiento local**: Los datos nunca salen del navegador
- **🔐 Sin servidores**: No se envía información a servicios externos
- **🛡️ Validación robusta**: Filtrado y validación de datos de entrada
- **🚫 Sin dependencias externas**: Sin riesgo de vulnerabilidades de terceros

## 🐛 Solución de problemas

### El archivo CSV no se procesa
1. Verifica que el archivo tenga extensión `.csv`
2. Comprueba que contenga las columnas requeridas
3. Revisa que las fechas estén en formato DD/MM/YYYY o similar
4. Asegúrate de que el archivo no esté corrupto

### Errores de parsing
- La aplicación muestra detalles de errores específicos
- Líneas problemáticas se omiten del análisis
- Estadísticas incluyen número de errores encontrados

### Rendimiento lento
- Usa la paginación para archivos grandes (>1000 registros)
- Considera dividir archivos muy grandes en chunks más pequeños
- Cierra otras pestañas del navegador para liberar memoria

## 🤝 Contribuir

Este proyecto está diseñado para ser fácilmente extensible:

1. **Fork** el repositorio
2. **Crea una rama** para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. **Desarrolla** manteniendo la estructura modular
4. **Prueba** tanto en desarrollo como con build
5. **Commit** tus cambios (`git commit -am 'Añadir nueva funcionalidad'`)
6. **Push** a la rama (`git push origin feature/nueva-funcionalidad`)
7. **Crea un Pull Request**

## 📄 Licencia

MIT License - ver `LICENSE` para detalles.

## 📞 Soporte

Para reportar bugs o solicitar funcionalidades, crear un issue en el repositorio.

---

**Desarrollado para la urbanización Salions** 🏘️
