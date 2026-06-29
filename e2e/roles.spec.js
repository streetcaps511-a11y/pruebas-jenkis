const { test, expect } = require('@playwright/test');

test.describe('Módulo de Configuración - Roles y Permisos', () => {

    test.beforeEach(async ({ page }) => {
        // Ajustar la URL y el flujo de login según la implementación del frontend
        // await page.goto('http://localhost:5173/login');
        // await page.fill('input[name="username"]', 'admin');
        // await page.fill('input[name="password"]', 'admin123');
        // await page.click('button[type="submit"]');
        await page.goto('http://localhost:5173/roles'); // Reemplazar con la ruta real del módulo de roles
    });

    test('HU_01: Registrar un rol nuevo y validar que no permite duplicados', async ({ page }) => {
        // Clic en el botón para crear un nuevo rol
        await page.click('button:has-text("Crear Rol")');
        
        // Llenar el formulario
        const nombreRol = 'Rol QA ' + Date.now();
        await page.fill('input[name="nombre"]', nombreRol);
        await page.fill('textarea[name="descripcion"]', 'Rol creado para pruebas automatizadas');
        
        // Asignar algunos permisos seleccionándolos de una lista/tabla
        await page.check('input[name="permisos"][value="1"]'); // Ajustar selector
        
        // Guardar el rol
        await page.click('button:has-text("Guardar")');
        
        // Verificar mensaje de éxito
        await expect(page.locator('.toast-success, .alert-success')).toContainText('exitosamente');

        // Validar caso de error: Intentar crear otro rol con el mismo nombre
        await page.click('button:has-text("Crear Rol")');
        await page.fill('input[name="nombre"]', nombreRol); // Mismo nombre
        await page.click('button:has-text("Guardar")');
        
        // Verificar mensaje de error de duplicado
        await expect(page.locator('.toast-error, .alert-error')).toContainText('ya existe');
    });

    test('HU_02: Editar rol existente', async ({ page }) => {
        // Clic en el botón editar del primer rol listado
        await page.click('.btn-editar-rol >> nth=0'); 
        
        const nuevoNombre = 'Rol Modificado ' + Date.now();
        await page.fill('input[name="nombre"]', nuevoNombre);
        await page.click('button:has-text("Actualizar")');
        
        // Validar mensaje de éxito y que la tabla refleja el cambio
        await expect(page.locator('.toast-success, .alert-success')).toContainText('actualizado');
        await expect(page.locator('table')).toContainText(nuevoNombre);
    });

    test('HU_03: Listar roles (incluyendo paginación)', async ({ page }) => {
        // Verificar que la tabla de roles es visible
        const tabla = page.locator('table');
        await expect(tabla).toBeVisible();
        
        // Verificar que existen registros
        const filas = await page.locator('table tbody tr').count();
        expect(filas).toBeGreaterThan(0);
        
        // Probar el botón "Siguiente" de paginación si existe
        const btnSiguiente = page.locator('.pagination-next');
        if (await btnSiguiente.isVisible() && await btnSiguiente.isEnabled()) {
            await btnSiguiente.click();
            await expect(page.locator('table tbody tr')).toBeVisible();
        }
    });

    test('HU_04: Cambiar el estado de un rol', async ({ page }) => {
        // Clic en el toggle de estado del primer rol
        const toggleBtn = page.locator('.toggle-estado-rol >> nth=0');
        await toggleBtn.click();
        
        // Manejar modal de confirmación si el sistema pide confirmación
        const modalConfirmacion = page.locator('.modal-confirmacion');
        if (await modalConfirmacion.isVisible()) {
            await page.click('button:has-text("Confirmar")');
        }

        // Validar el mensaje de éxito del cambio de estado
        await expect(page.locator('.toast-success, .alert-success')).toContainText('estado');
    });

    test('HU_05: Visualizar el detalle de un rol y sus permisos', async ({ page }) => {
        // Clic en el botón de ver detalle del primer rol
        await page.click('.btn-ver-detalle >> nth=0');
        
        // Validar que se muestre la información del rol
        await expect(page.locator('.detalle-rol-nombre')).toBeVisible();
        // Validar que se muestre la lista de permisos asignados
        await expect(page.locator('.lista-permisos-asignados')).toBeVisible();
    });

    test('HU_06: Eliminar un rol', async ({ page }) => {
        // Clic en el botón eliminar del primer rol
        await page.click('.btn-eliminar-rol >> nth=0');
        
        // Confirmar eliminación en el modal
        await expect(page.locator('.modal-confirmacion')).toBeVisible();
        await page.click('button:has-text("Eliminar")');
        
        // Validar mensaje de éxito
        await expect(page.locator('.toast-success, .alert-success')).toContainText('eliminado');
    });

    test('HU_07: Listar permisos', async ({ page }) => {
        // Ir a la sección de registrar rol para ver la lista de permisos
        await page.click('button:has-text("Crear Rol")');
        
        // Verificar que la lista de permisos es visible
        const tablaPermisos = page.locator('.tabla-permisos'); // Ajustar el selector
        await expect(tablaPermisos).toBeVisible();
        
        const cantidadPermisos = await page.locator('.permiso-item').count();
        expect(cantidadPermisos).toBeGreaterThan(0);
    });

    test('HU_08: Buscar permisos', async ({ page }) => {
        // Ir a la sección de registrar rol
        await page.click('button:has-text("Crear Rol")');
        
        // Buscar un permiso específico (ej: "Listar")
        await page.fill('input[placeholder="Buscar permiso..."]', 'Listar');
        
        // Validar que los resultados filtrados contienen la palabra buscada
        const primerResultado = page.locator('.permiso-item >> nth=0');
        await expect(primerResultado).toContainText('Listar');
    });
});
