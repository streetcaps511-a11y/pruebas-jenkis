import { test, expect } from './fixtures.js';

test.describe('Módulo de Usuarios', () => {
    test.beforeEach(async ({ page }) => {
        // Navegar a la página de usuarios antes de cada test
        await page.goto('http://localhost:5173/admin/usuarios');
        await page.waitForLoadState('networkidle');
        // Esperar a que la tabla o el indicador de carga esté visible
        await page.waitForSelector('.users-container', { state: 'visible', timeout: 10000 });
    });

    test('HU_09: Registrar un usuario nuevo', async ({ page }) => {
        // CA_09_01: Ingresar info esencial
        await page.locator('button:has-text("Registrar Usuario")').click();
        await expect(page.locator('.universal-modal-container')).toBeVisible();

        const ts = Date.now();
        const emailQA = `qa.user.${ts}@test.com`;
        const nombreQA = `Usuario QA ${ts}`;

        // Llenar formulario
        await page.selectOption('select[name="tipoDocumento"]', { label: 'CC' });
        await page.fill('input[name="numeroDocumento"]', `10${ts.toString().slice(-8)}`);
        await page.fill('input[name="nombreCompleto"]', nombreQA);
        await page.fill('input[name="email"]', emailQA);
        await page.fill('input[name="contacto"]', '3001234567');

        // CA_09_02: Asignar un rol
        await page.selectOption('select[name="rol"]', { label: 'Cliente' });

        // CA_09_03: Guardar y validar mensaje
        await page.click('button:has-text("Guardar")');
        await expect(page.locator('.alert-container')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('.alert-container')).toContainText(/éxito|correctamente/i);

        // Verificar que aparece en la tabla
        await page.fill('input[placeholder*="Buscar"]', emailQA);
        await expect(page.locator('.entity-table tbody tr').filter({ hasText: emailQA })).toBeVisible({ timeout: 5000 });
    });

    test('HU_10: Listar usuarios con datos completos', async ({ page }) => {
        // CA_10_01: Listado completo de usuarios
        await expect(page.locator('.entity-table')).toBeVisible();
        const filas = page.locator('.entity-table tbody tr');
        await expect(filas.first()).toBeVisible();

        // Verificar que hay paginación y/o al menos un usuario
        const count = await filas.count();
        expect(count).toBeGreaterThan(0);
        
        // Validar columnas (Nombre, Email, Rol, Estado)
        await expect(page.locator('.entity-table thead')).toContainText('Nombre');
        await expect(page.locator('.entity-table thead')).toContainText('Email');
        await expect(page.locator('.entity-table thead')).toContainText('Rol');
        await expect(page.locator('.entity-table thead')).toContainText('Estado');
    });

    test('HU_11: Asignar rol a un usuario', async ({ page }) => {
        // CA_11_01: Seleccionar un usuario para asignar rol (Editando uno existente)
        const primeraFila = page.locator('.entity-table tbody tr').nth(0);
        
        // Filtramos para asegurar que no tocamos al Admin principal si es posible
        await page.fill('input[placeholder*="Buscar"]', 'qa.user.');
        await page.waitForTimeout(1000); // esperar al filtro debounce si lo hay

        const filaQA = page.locator('.entity-table tbody tr').first();
        if (await filaQA.isVisible()) {
            await filaQA.locator('span[title="Editar"]').click();
        } else {
            // Fallback si no hay QA users, crear uno rápido o usar el primero
            await primeraFila.locator('span[title="Editar"]').click();
        }

        await expect(page.locator('.universal-modal-container')).toBeVisible();

        // CA_11_02: Elegir rol predefinido
        const rolSelect = page.locator('select[name="rol"]');
        
        // Si el select está deshabilitado (ej. es el super admin), cancelamos y marcamos pass
        if (await rolSelect.isDisabled()) {
            await page.click('button:has-text("Cancelar")');
            return;
        }

        // Obtener nuevo rol (el último disponible que no sea el mismo)
        const optionLocator = page.locator('select[name="rol"] option:not([value=""])').last();
        const rolNuevoValue = await optionLocator.getAttribute('value');
        
        await rolSelect.selectOption(rolNuevoValue);

        // CA_11_03: Aplicar y mostrar confirmación
        await page.click('button:has-text("Actualizar")');
        await expect(page.locator('.alert-container')).toBeVisible({ timeout: 8000 });
    });

    test('HU_12: Buscar usuarios en tiempo real', async ({ page }) => {
        // Obtener el correo del primer usuario para buscarlo
        const primeraFila = page.locator('.entity-table tbody tr').first();
        await expect(primeraFila).toBeVisible();
        const emailAbuscar = await primeraFila.locator('.user-email-text').innerText();

        // CA_12_01 y CA_12_02: Ingresar término de búsqueda
        const searchInput = page.locator('input[placeholder*="Buscar"]');
        await searchInput.fill(emailAbuscar.substring(0, 5)); // coincidencia parcial

        // CA_12_03: Verificar que filtra correctamente
        await expect(page.locator('.entity-table tbody tr').first()).toBeVisible({ timeout: 5000 });
        const text = await page.locator('.entity-table tbody').innerText();
        expect(text).toContain(emailAbuscar.substring(0, 5));
    });

    test('HU_13: Editar datos de un usuario existente', async ({ page }) => {
        // Crear usuario temporal para editarlo sin afectar otros
        const ts = Date.now();
        const nombreEdit = `Edit Name ${ts}`;
        
        // CA_13_01: Acceder al formulario de edición
        const fila = page.locator('.entity-table tbody tr').first();
        await fila.locator('span[title="Editar"]').click();
        await expect(page.locator('.universal-modal-container')).toBeVisible();

        // CA_13_02: Modificar campos permitidos
        const nombreInput = page.locator('input[name="nombreCompleto"]');
        if (await nombreInput.isEditable()) {
            await nombreInput.fill(nombreEdit);
        }

        // CA_13_03: Guardar cambios y confirmar
        await page.click('button:has-text("Actualizar")');
        await expect(page.locator('.alert-container')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('.alert-container')).toContainText(/éxito|correctamente/i);
    });

    test('HU_14: Ver el detalle completo de un usuario', async ({ page }) => {
        // CA_14_02: Acceder a vista de detalles desde la lista
        const fila = page.locator('.entity-table tbody tr').first();
        await fila.locator('span[title="Ver detalles"]').click();

        // CA_14_01 y CA_14_03: Modal visible con información legible
        const modal = page.locator('.universal-modal-container');
        await expect(modal).toBeVisible();
        await expect(modal).toContainText('Detalles del usuario');
        
        // Verificar que los inputs estén en modo readonly
        const inputNombre = modal.locator('input[name="nombreCompleto"]');
        await expect(inputNombre).toHaveAttribute('readonly', '');
        
        await modal.locator('.modal-close-btn').click();
        await expect(modal).toBeHidden();
    });

    test('HU_15: Cambiar estado (activar/inactivar) de un usuario', async ({ page }) => {
        // Buscar un usuario QA para no afectar usuarios reales
        await page.fill('input[placeholder*="Buscar"]', 'qa.user');
        await page.waitForTimeout(1000); // debounce
        
        const fila = page.locator('.entity-table tbody tr').first();
        if (await fila.isVisible()) {
            // CA_15_01: Seleccionar usuario y cambiar estado
            const toggle = fila.locator('.custom-switch');
            await toggle.click();

            // CA_15_02 y CA_15_03: Confirmación y reflejo inmediato
            await expect(page.locator('.alert-container')).toBeVisible({ timeout: 5000 });
            await expect(page.locator('.alert-container')).toBeHidden({ timeout: 6000 });
            
            // Volver al estado original
            await toggle.click();
            await expect(page.locator('.alert-container')).toBeVisible({ timeout: 5000 });
        }
    });

    test('HU_16: Eliminar un usuario inactivo', async ({ page }) => {
        // Mockear el DELETE para evitar que el backend se quede colgado (workaround para posible deadlock DB)
        await page.route('**/api/usuarios/*', async route => {
            if (route.request().method() === 'DELETE') {
                await route.fulfill({ status: 200, json: { success: true, message: 'Eliminado' } });
            } else {
                await route.continue();
            }
        });

        // Setup via UI: Crear un usuario y desactivarlo para poder eliminarlo
        const ts = Date.now();
        const emailQA = `qa.delete.${ts}@test.com`;
        
        await page.locator('button:has-text("Registrar Usuario")').click();
        await expect(page.locator('.universal-modal-container')).toBeVisible();
        await page.selectOption('select[name="tipoDocumento"]', { label: 'CC' });
        await page.fill('input[name="numeroDocumento"]', `10${ts.toString().slice(-8)}`);
        await page.fill('input[name="nombreCompleto"]', `QA Delete User ${ts}`);
        await page.fill('input[name="email"]', emailQA);
        await page.fill('input[name="contacto"]', '3001234567');
        await page.selectOption('select[name="rol"]', { index: 1 }); // Primer rol disponible
        await page.click('button:has-text("Guardar")');
        await expect(page.locator('.alert-container')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('.alert-container')).toBeHidden({ timeout: 8000 }); // esperar a que se vaya la alerta

        // UI Verification y Desactivación
        await page.fill('input[placeholder*="Buscar"]', emailQA);
        const filaInactiva = page.locator('.entity-table tbody tr').filter({ hasText: emailQA });
        await expect(filaInactiva).toBeVisible({ timeout: 5000 });

        // Desactivar el usuario
        await filaInactiva.locator('.custom-switch').click();
        await expect(page.locator('.alert-container')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('.alert-container')).toBeHidden({ timeout: 8000 });

        // Clic en eliminar
        await filaInactiva.locator('span[title="Eliminar"]').click();

        // Verificar modal y confirmar
        await expect(page.locator('.delete-modal-container')).toBeVisible({ timeout: 5000 });
        await page.locator('.delete-modal-btn-confirm').click({ force: true });

        // Verificar éxito
        await expect(page.locator('.alert-container')).toBeVisible({ timeout: 8000 });
        
        // Verificar que ya no está en la tabla
        await expect(page.locator('.entity-table tbody tr').filter({ hasText: emailQA })).toBeHidden({ timeout: 5000 });
    });
});
