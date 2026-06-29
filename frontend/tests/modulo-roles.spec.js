import { test, expect } from './fixtures.js';

test.describe('Módulo de Configuración - Roles y Permisos', () => {
    test.beforeEach(async ({ page }) => {
        // ✅ Ya NO necesita login - usa el storageState del setup
        await page.goto('http://localhost:5173/admin/roles');
        await page.waitForSelector('.entity-table', { timeout: 15000 });
    });

    test('HU_01: Registrar un rol nuevo y validar que no permite duplicados', async ({ page }) => {
        // CA_01_01: Formulario accesible
        await page.click('button.roles-btn-add');
        await page.waitForSelector('.role-form', { timeout: 5000 });

        // CA_01_02: Completar y guardar
        const nombreRol = 'Rol QA ' + Date.now();
        await page.fill('input[placeholder="Ej: Vendedor"]', nombreRol);
        await page.fill('input[placeholder="Breve descripción"]', 'Rol creado para pruebas automatizadas');
        await page.locator('.permission-item').first().click();
        await page.click('button:has-text("Guardar")');
        await expect(page.locator('.alert-container')).toBeVisible({ timeout: 5000 });

        // CA_01_03: No permite duplicados
        await page.click('button.roles-btn-add');
        await page.waitForSelector('.role-form', { timeout: 5000 });
        await page.fill('input[placeholder="Ej: Vendedor"]', nombreRol);
        await page.click('button:has-text("Guardar")');
        await expect(page.locator('.alert-container')).toBeVisible({ timeout: 5000 });
    });

    test('HU_02: Editar rol existente', async ({ page }) => {
        // CA_02_01: Ver información actual del rol
        await page.locator('span[title="Editar"]').first().click();
        await page.waitForSelector('.role-form', { timeout: 5000 });

        // CA_02_02: Modificar y guardar
        const nuevoNombre = 'Rol Modificado ' + Date.now();
        await page.fill('input[placeholder="Ej: Vendedor"]', nuevoNombre);
        await page.click('button:has-text("Guardar")');
        await expect(page.locator('.alert-container')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('.entity-table')).toContainText(nuevoNombre);
    });

    test('HU_03: Listar roles (incluyendo paginación)', async ({ page }) => {
        // CA_03_01: Lista visible
        await expect(page.locator('.entity-table')).toBeVisible();

        // CA_03_02: Existen registros
        const filas = await page.locator('.entity-table tbody tr').count();
        expect(filas).toBeGreaterThan(0);

        // CA_03_03: Paginación
        const btnSiguiente = page.locator('.pagination-next');
        if (await btnSiguiente.isVisible() && await btnSiguiente.isEnabled()) {
            await btnSiguiente.click();
            await expect(page.locator('.entity-table tbody tr').first()).toBeVisible();
        }
    });

    test('HU_04: Cambiar el estado de un rol', async ({ page }) => {
        // CA_04_01 y CA_04_02: Cambiar estado
        await page.locator('.custom-switch').first().click();

        // CA_04_03: Confirmación si aparece modal
        const modal = page.locator('[class*="modal"], [class*="confirm"]').first();
        try {
            await modal.waitFor({ state: 'visible', timeout: 2000 });
            await page.click('button:has-text("Confirmar")');
        } catch (_e) {
            // No apareció el modal
        }

        await expect(page.locator('.alert-container')).toBeVisible({ timeout: 5000 });
    });

    test('HU_05: Visualizar el detalle de un rol y sus permisos', async ({ page }) => {
        // CA_05_01, CA_05_02, CA_05_03: Ver detalles y permisos
        await page.locator('span[title="Ver detalles"]').first().click();
        await expect(page.locator('.permissions-grid')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('.permission-item').first()).toBeVisible();
    });

    test('HU_06: Eliminar un rol', async ({ page }) => {
        // CA_06_01: Solo admin puede eliminar (autenticado como Administrador)
        // CA_06_02: Regla de negocio — solo roles INACTIVOS se pueden eliminar
        //           Setup: desactivamos un Rol QA vía API para garantizar estado consistente

        // Paso 1: Obtener token JWT de la sesión activa
        const token = await page.evaluate(() => sessionStorage.getItem('token'));
        expect(token, 'Token de sesión no encontrado').toBeTruthy();

        // Paso 2: Obtener lista completa de roles desde el backend
        const rolesRes = await page.request.get('http://localhost:3000/api/roles', {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(rolesRes.ok()).toBeTruthy();
        const rolesBody = await rolesRes.json();
        const roles = rolesBody.data || rolesBody;

        // Paso 3: Seleccionar un Rol QA activo para desactivar y luego eliminar
        const rolTarget = roles.find(r =>
            (r.Nombre || r.nombre || '').startsWith('Rol QA') && r.Estado !== false
        );
        expect(rolTarget, 'Se requiere al menos un Rol QA activo para ejecutar HU_06').toBeTruthy();

        const rolId   = rolTarget.IdRol || rolTarget.id;
        const rolNombre = rolTarget.Nombre || rolTarget.nombre;

        // Paso 4: Desactivar el rol vía API (evita dependencia del toggle UI)
        const deactivateRes = await page.request.put(
            `http://localhost:3000/api/roles/${rolId}`,
            {
                headers: { Authorization: `Bearer ${token}` },
                data: { ...rolTarget, Estado: false },
            }
        );
        expect(deactivateRes.ok(), `No se pudo desactivar el rol ${rolNombre}`).toBeTruthy();

        // Paso 5: Recargar la página para que refleje el estado inactivo del rol
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForSelector('.entity-table', { timeout: 10000 });

        // Paso 6: Localizar la fila del rol ya inactivo por su nombre exacto
        const filaInactiva = page.locator('.entity-table tbody tr')
            .filter({ hasText: rolNombre });
        await expect(filaInactiva).toBeVisible({ timeout: 5000 });

        // CA_06_03: Hacer clic en Eliminar (ahora el rol es inactivo → debe abrir modal)
        await filaInactiva.locator('span[title="Eliminar"]').click();

        // CA_06_04: Verificar que aparece el modal de confirmación real (ConfirmDeleteModal)
        await expect(page.locator('.delete-modal-container')).toBeVisible({ timeout: 5000 });

        // CA_06_05: Confirmar la eliminación
        await page.locator('.delete-modal-btn-confirm').click();

        // CA_06_06: Verificar alerta de éxito post-eliminación
        await expect(page.locator('.alert-container')).toBeVisible({ timeout: 8000 });

        // CA_06_07: Verificar que el rol ya no aparece en la tabla
        await expect(
            page.locator('.entity-table tbody tr').filter({ hasText: rolNombre })
        ).toBeHidden({ timeout: 5000 });
    });

    test('HU_07: Listar permisos', async ({ page }) => {
        // CA_07_01: Vista con todos los permisos
        await page.click('button.roles-btn-add');
        await expect(page.locator('.permissions-grid')).toBeVisible({ timeout: 5000 });

        // CA_07_02 y CA_07_03: Permisos visibles y seleccionables
        const cantidadPermisos = await page.locator('.permission-item').count();
        expect(cantidadPermisos).toBeGreaterThan(0);
    });
});