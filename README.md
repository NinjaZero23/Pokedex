# Pokédex 🔴

Una Pokédex web completa construida con HTML, CSS y JavaScript puro.  
Usa la [PokéAPI](https://pokeapi.co/) gratuita — no necesita backend ni base de datos.

---

## 📁 Estructura del proyecto

```
pokedex/
├── index.html   → Estructura de la página (el "esqueleto")
├── style.css    → Todo el diseño visual
├── app.js       → Toda la lógica y llamadas a la API
└── README.md    → Este archivo
```

---

## 🚀 Cómo usar en local (tu computador)

1. Descarga los 3 archivos: `index.html`, `style.css`, `app.js`
2. Ponlos todos en la **misma carpeta**
3. Abre `index.html` con tu navegador (doble clic)
4. ¡Listo! Necesitas conexión a internet para cargar los datos de la PokéAPI

> ⚠️ Algunos navegadores bloquean peticiones desde archivos locales.
> Si no carga, usa la extensión **Live Server** en VS Code (ver abajo).

---

## 🌐 Cómo subir a GitHub Pages (gratis, con URL pública)

Sigue estos pasos exactamente:

### Paso 1 — Crea una cuenta en GitHub
Ve a [github.com](https://github.com) y regístrate si no tienes cuenta.

### Paso 2 — Instala Git en tu computador
- **Windows**: Descarga desde [git-scm.com](https://git-scm.com/download/win) e instala
- **Mac**: Abre la Terminal y escribe `git --version` (se instala automáticamente)
- **Linux**: `sudo apt install git`

Verifica que quedó instalado:
```bash
git --version
# Debe mostrar algo como: git version 2.x.x
```

### Paso 3 — Configura tu nombre en Git (solo la primera vez)
Abre la Terminal (o Git Bash en Windows) y escribe:
```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
```

### Paso 4 — Crea el repositorio en GitHub
1. Ve a [github.com/new](https://github.com/new)
2. En "Repository name" escribe: `pokedex`
3. Deja el resto como está
4. Haz clic en **"Create repository"**

### Paso 5 — Sube tus archivos
En la Terminal, navega hasta la carpeta donde están tus archivos:
```bash
# Ejemplo si tus archivos están en el Escritorio:
cd ~/Desktop/pokedex

# En Windows puede ser:
cd C:\Users\TuNombre\Desktop\pokedex
```

Luego ejecuta estos comandos uno por uno:
```bash
# 1. Inicializar git en la carpeta
git init

# 2. Agregar todos los archivos
git add .

# 3. Crear el primer "guardado" (commit)
git commit -m "Primera versión de la Pokédex"

# 4. Conectar con tu repositorio en GitHub
#    (cambia "TuUsuario" por tu usuario real de GitHub)
git remote add origin https://github.com/TuUsuario/pokedex.git

# 5. Subir los archivos
git branch -M main
git push -u origin main
```

### Paso 6 — Activar GitHub Pages
1. Ve a tu repositorio en GitHub: `github.com/TuUsuario/pokedex`
2. Haz clic en la pestaña **"Settings"** (arriba a la derecha)
3. En el menú izquierdo, haz clic en **"Pages"**
4. En "Branch" selecciona **main** y la carpeta **/ (root)**
5. Haz clic en **"Save"**
6. Espera 1-2 minutos y tu Pokédex estará en:
   ```
   https://TuUsuario.github.io/pokedex
   ```

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

## 🛠️ Desarrollo local con VS Code

Para una mejor experiencia de desarrollo:

1. Instala [VS Code](https://code.visualstudio.com/)
2. Instala la extensión **Live Server** (de Ritwick Dey)
3. Abre la carpeta del proyecto en VS Code
4. Haz clic derecho en `index.html` → **"Open with Live Server"**
5. Se abre en el navegador con recarga automática al guardar

---

## 🔧 Cómo modificarlo

### Cambiar los colores del tema
Abre `style.css` y edita las variables en `:root { }` (líneas del inicio):
```css
:root {
  --accent: #4af0c4;   /* ← Cambia este color para el acento principal */
  --red:    #ff4d6d;   /* ← Color del logo pokébola */
  /* ... */
}
```

### Cambiar la fuente
En `index.html`, cambia el link de Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=NUEVA_FUENTE&display=swap" rel="stylesheet">
```
Y en `style.css` cambia `--font: 'NUEVA_FUENTE', sans-serif;`

### Cambiar la generación que carga al inicio
Al final de `app.js` está:
```javascript
loadGen(1, 151); // ← Gen I: pokémon del 1 al 151
```
Cámbialo por ejemplo a `loadGen(152, 251)` para cargar Gen II al inicio.

---

## 📡 API usada

**PokéAPI** — [pokeapi.co](https://pokeapi.co)
- Completamente gratuita
- Sin registro ni API key
- Datos de todos los pokémon, especies, evoluciones y más
