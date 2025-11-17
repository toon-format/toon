# Modelos 3D

## Cómo agregar tu modelo GLTF de AirPods

1. **Obtener un modelo 3D**:
   - Busca en [Sketchfab](https://sketchfab.com/search?q=airpods&type=models) (filtrar por licencia Creative Commons)
   - Descarga en formato `.glb` o `.gltf`
   - También puedes crear tu propio modelo en Blender

2. **Convertir a GLB** (si es necesario):
   Si tienes un archivo `.gltf`, puedes convertirlo a `.glb` usando:
   - [glTF Pipeline](https://github.com/CesiumGS/gltf-pipeline)
   - Comando: `gltf-pipeline -i model.gltf -o airpods.glb -b`

3. **Optimizar el modelo**:
   ```bash
   # Instalar gltf-transform
   npm install -g @gltf-transform/cli

   # Optimizar
   gltf-transform optimize airpods.glb airpods-optimized.glb

   # Comprimir texturas a KTX2 (opcional, mejor rendimiento)
   gltf-transform ktx airpods-optimized.glb airpods.glb --slots baseColor
   ```

4. **Colocar el archivo**:
   - Coloca `airpods.glb` en esta carpeta (`public/models/`)
   - El archivo debe llamarse exactamente `airpods.glb`

5. **Activar el modelo en el código**:
   En `src/components/AirPodsModel.tsx`, cambia:
   ```typescript
   <AirPodsModel useGLTFModel={true} />
   ```

6. **Ajustar escala y posición** (si es necesario):
   En `src/components/AirPodsModel.tsx`, línea ~165:
   ```typescript
   <primitive
     object={scene}
     scale={1.5}           // Ajustar tamaño
     position={[0, 0, 0]}  // Ajustar posición
     rotation={[0, 0, 0]}  // Ajustar rotación
   />
   ```

## Placeholder actual

Por defecto, el proyecto usa un placeholder construido con geometrías simples de Three.js:
- **Estuche**: BoxGeometry
- **Auriculares**: SphereGeometry (cabeza) + CylinderGeometry (tallo)

Este placeholder funciona completamente y demuestra todas las animaciones y características del proyecto.

## Ejemplo de estructura de modelo ideal

Para mejores resultados, tu modelo GLTF debería tener:
- **Separación de partes**: Estuche (base y tapa), auricular izquierdo, auricular derecho
- **Pivot points**: Correctamente posicionados para animaciones
- **Texturas**: Tamaño máximo 2048x2048 (preferiblemente 1024x1024)
- **Polígonos**: Menos de 50k triángulos totales
- **Materiales PBR**: Con mapas de roughness, metalness, normal

## Troubleshooting

### El modelo es muy grande/pequeño
Ajusta el parámetro `scale` en el componente

### El modelo está rotado incorrectamente
Ajusta el parámetro `rotation` en el componente

### El modelo no se ve
- Verifica que el archivo se llame exactamente `airpods.glb`
- Revisa la consola del navegador para errores
- Valida el modelo en [GLTF Validator](https://github.khronos.org/glTF-Validator/)

### Rendimiento bajo
- Reduce el número de polígonos
- Comprime las texturas
- Usa formato KTX2 para texturas

## Recursos útiles

- [Three.js GLTF Viewer](https://gltf-viewer.donmccurdy.com/) - Previsualizar modelos
- [GLTF Report](https://gltf.report/) - Analizar y optimizar modelos
- [Blender](https://www.blender.org/) - Software gratuito para crear y editar modelos 3D
- [Blender GLTF Export](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html) - Documentación
