<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Proyecto Salions Matrículas

Este es un proyecto de aplicación web para análisis de datos CSV de matrículas de vehículos. La aplicación debe:

- Ser desarrollada de forma modular (HTML, CSS, JS separados) pero construible en un solo archivo HTML
- Usar JavaScript vanilla sin dependencias externas
- Procesar archivos CSV localmente en el navegador
- Agrupar datos por socio peticionario
- Proporcionar filtros predefinidos para análisis
- Mostrar resultados en tablas interactivas ordenables
- Mantener la privacidad procesando todo localmente

## Estructura de desarrollo
- `src/` - archivos fuente modulares
- `dist/` - archivo HTML único para distribución
- `build/` - scripts de construcción

## Consideraciones técnicas
- Usar File API para lectura de CSV
- Implementar parser CSV robusto
- Crear componentes UI reutilizables
- Optimizar para uso en equipos con recursos limitados
