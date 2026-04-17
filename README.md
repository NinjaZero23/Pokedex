# Pokédex 🔴

Una Pokédex web completa construida con HTML, CSS y JavaScript puro.  
Usa la [PokéAPI](https://pokeapi.co/) gratuita — no necesita backend ni base de datos.

---

## 📁 Estructura del proyecto

```
pokedex/
├── index.html    → Página principal (requiere sesión activa)
├── login.html    → Página de login y registro
├── style.css     → Estilos globales (variables, layout, tarjetas, panel)
├── auth.css      → Estilos de la página de autenticación
├── app.js        → Lógica de la Pokédex y llamadas a la API
├── auth.js       → Lógica de login y registro (localStorage)
├── session.js    → Protección de ruta: redirige a login si no hay sesión
├── CLAUDE.md     → Guía de arquitectura para Claude Code
└── README.md     → Este archivo
```

---

## 🚀 Cómo usar en local (tu computador)

1. Descarga todos los archivos del proyecto y ponlos en la **misma carpeta**
2. Abre `login.html` con tu navegador (o usa Live Server en VS Code)
3. Crea una cuenta o inicia sesión — los datos se guardan solo en tu navegador
4. ¡Listo! Necesitas conexión a internet para cargar los datos de la PokéAPI

> ⚠️ Algunos navegadores bloquean peticiones desde archivos locales.
> Si no carga, usa la extensión **Live Server** en VS Code (ver abajo).

---


## ✨ Funcionalidades

| Funcionalidad | Descripción |
|---|---|
| 8 generaciones | Kanto hasta Galar (pokémon 1–905) |
| Búsqueda | Por nombre o número en tiempo real |
| Filtro por tipo | Barra con todos los tipos de la generación |
| Panel de detalle | Descripción, altura, peso, habilidades |
| Estadísticas | Barras animadas con colores por stat |
| Debilidades | Calculadas automáticamente (×2, ×4) |
| Resistencias | Con multiplicadores (×0.5, ×0.25, ×0) |
| Sprites | Normal, Shiny y Espalda |
| Evoluciones | Cadena clickeable con niveles |
| Responsive | En móvil el panel sube como un drawer |
| Atajos de teclado | `/` para buscar, `Esc` para cerrar |

---

## ⌨️ Atajos de teclado

| Tecla | Acción |
|---|---|
| `/` | Enfoca el buscador |
| `Esc` | Cierra el panel de detalle |

---


## 📡 API usada

**PokéAPI** — [pokeapi.co](https://pokeapi.co)
- Completamente gratuita
- Sin registro ni API key
- Datos de todos los pokémon, especies, evoluciones y más
