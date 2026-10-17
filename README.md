# FMCWorkshop 🧩

[![GitHub Pages](https://img.shields.io/badge/Demo%20en%20Vivo-GitHub%20Pages-brightgreen?style=flat-square&logo=github)](https://camiloguzman31415.github.io/FMCWorkshop/)

> 🌐 **Pruébalo en vivo sin instalar nada:** [**https://camiloguzman31415.github.io/FMCWorkshop/**](https://camiloguzman31415.github.io/FMCWorkshop/)

Herramienta interactiva y visualizador 3D para el aprendizaje, entrenamiento y análisis avanzado de **Fewest Moves (FMC)** en el Cubo de Rubik 3x3.

Inspirado en flujos de trabajo profesionales como *333.fm*, *Insertion Finder* y *Nissy*.

---

## ✨ Características Principales

* **Visualización 3D Interactiva:**
  * Renderizado mediante **Three.js** con controles orbitales intuitivos (rotación, zoom y paneo).
  * Animación fluida de giros de capas capa por capa o reproducción de la solución completa.
  * Selector de zoom por defecto y ajuste adaptativo al tamaño de la ventana.

* **Soporte Completo de NISS (*Normal Inverse Scramble Search*):**
  * Sintaxis con paréntesis `( ... )` para alternar entre el scramble normal y el scramble inverso.
  * Muestra el scramble inverso automáticamente en tiempo real.
  * Cálculo dinámico del estado del cubo en cualquier punto de la solución: haz clic en cualquier parte del texto o mueve el cursor y el cubo 3D reflejará exactamente el estado en ese paso específico.

* **Soporte de Inserciones y Conmutadores:**
  * Notación de inserciones con `@`, `@@`, `*`, `*1` y etiquetas de reemplazo `@= [algoritmo]`.
  * Expansión automática de conmutadores `[A, B]` $\to$ $A\ B\ A'\ B'$ y conjugados `[A: B]` $\to$ $A\ B\ A'$.

* **Análisis de Estado y Detección de EO y DR:**
  * **Edge Orientation (EO) en los 3 ejes simultáneamente:** Resumen en vivo de aristas desorientadas en los ejes **F/B**, **R/L** y **U/D** con garantía de paridad matemática.
  * Resaltado 3D por capas (*Highlight*): Resalta aristas malas en rojo neón, esquinas orientadas y capas del corte E para **Domino Reduction (DR)**.
  * Clic interactivo en el badge de EO para alternar el eje activo rápidamente.

* **Compatibilidad con Nissy y FMC Playback:**
  * Botón para copiar el estado exacto de movimientos al portapapeles.
  * Controles de reproducción interactiva: inicio, paso atrás, reproducción automática, paso adelante y fin.

---

## 🚀 Cómo Usarlo

No requiere instalación de dependencias ni servidores complejos; es una aplicación estática y autónoma.

1. Clona el repositorio:
   ```bash
   git clone https://github.com/Camiloguzman31415/FMCWorkshop.git
   ```
2. Abre el archivo `index.html` en cualquier navegador moderno (Chrome, Firefox, Edge, Safari).
3. Ingresa tu mezcla en el campo **Scramble** y comienza a redactar tus pasos en **Solution Moves**.

---

## 🛠️ Tecnologías Utilizadas

* **HTML5 / CSS3 Moderno** (Diseño oscuro tipo FMCWorkshop, responsive y accesible).
* **JavaScript (ES6+)** con motor analítico propio del cubo de Rubik (`cube.js`).
* **Three.js & OrbitControls** para el renderizado tridimensional.
