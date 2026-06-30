import { test, expect } from './fixtures.js';

test.describe('Módulo Compras', () => {
    
    test.beforeEach(async ({ page }) => {
        // Usamos la sesión global guardada por auth.setup.js
        await page.goto('http://localhost:5173/admin/compras');
        await page.waitForLoadState('networkidle');
    });

    test('HU_Compras_01: Listar y buscar compras', async ({ page }) => {
        // Validar que la tabla carga
        await expect(page.locator('.compras-title')).toContainText('Compras');
        await expect(page.locator('.entity-table')).toBeVisible();

        // 1. Buscador por texto (Proveedor o ID)
        const searchInput = page.locator('.devoluciones-search-wrapper input');
        if (await searchInput.isVisible()) {
            await searchInput.fill('Test Provider');
            await page.waitForTimeout(1000); // Esperar a que filtre
            await searchInput.fill('');
            await page.waitForTimeout(500);
        }

        // 2. Buscador por estado (StatusFilter)
        const statusFilterBtn = page.locator('.status-filter-trigger').first();
        if (await statusFilterBtn.isVisible()) {
            await statusFilterBtn.dispatchEvent('click');
            await page.waitForTimeout(500);
            
            // Seleccionar un estado específico (ej. "Completada")
            const filterOption = page.locator('.filter-option-item:has-text("Completada")').first();
            if (await filterOption.isVisible()) {
                await filterOption.dispatchEvent('click');
                await page.waitForTimeout(1000); // Esperar a que filtre
            }
            
            // Volver a "Todos"
            await statusFilterBtn.dispatchEvent('click');
            await page.waitForTimeout(500);
            await page.locator('.filter-option-item:has-text("Todos")').first().dispatchEvent('click');
            await page.waitForTimeout(500);
        }
    });

    test('HU_Compras_02: Registrar nueva compra', async ({ page }) => {
        // Clic en registrar compra
        await page.click('button:has-text("Registrar Compra")');
        await expect(page.locator('.compras-title')).toContainText('Registrar Compra');

        // Llenar formulario
        const numFactura = `FACT-${Math.floor(Math.random() * 10000)}`;
        await page.fill('input[placeholder^="Nº"]', numFactura);
        
        // Seleccionar proveedor (el primer option > 0)
        const selectProveedor = page.locator('select.compras-form-select').first();
        await page.waitForTimeout(1000); // Esperar carga desde API
        const optionsCount = await selectProveedor.locator('option').count();
        
        if (optionsCount <= 1) {
            test.skip(true, 'No hay proveedores disponibles. Se requiere al menos uno para registrar una compra.');
            return;
        }
        
        await selectProveedor.selectOption({ index: 1 });

        // Llenar fechas (Componente DateInputWithCalendar)
        const dateContainers = page.locator('.date-input-container');
        const count = await dateContainers.count();
        if (count > 0) {
            for (let i = 0; i < count; i++) {
                const container = dateContainers.nth(i);
                await container.locator('select').nth(0).selectOption({ index: 1 }); // Primer día
                await container.locator('select').nth(1).selectOption({ index: 1 }); // Primer mes
                await container.locator('input[placeholder="aaaa"]').fill('2023'); // Año pasado para evitar fecha futura
            }
        }

        // Llenar producto (ya hay una fila por defecto)
        const rowProducto = page.locator('.producto-item-form').last();
        
        const inputNombre = rowProducto.locator('input[placeholder*="Escribir producto"]');
        await inputNombre.fill('Gorra Prueba E2E');
        
        const selectTalla = rowProducto.locator('.producto-item-form__variant-select');
        await selectTalla.selectOption({ index: 1 });
        
        const inputPrecioCompra = rowProducto.locator('.producto-item-form__input--price');
        await inputPrecioCompra.fill('20000');
        
        const inputPrecioVenta = rowProducto.locator('.producto-item-form__input--sell');
        await inputPrecioVenta.fill('40000');

        // Guardar compra y esperar respuesta y alerta concurrentemente
        await Promise.all([
            page.waitForResponse(resp => resp.url().includes('/api/compras') && resp.request().method() === 'POST' && (resp.status() === 201 || resp.status() === 200)),
            expect(page.locator('.alert-container').first()).toContainText(/éxito|creada|registrada|correctamente/i, { timeout: 10000 }),
            page.click('button.compras-btn-submit')
        ]);
        
        // Esperar un momento para asegurar que cerró
        await page.waitForTimeout(1500); 
    });

    test('HU_Compras_03: Ver detalles de la compra y exportar a PDF', async ({ page }) => {
        // Verificar si hay compras para ver, si no, crear una rápido (opcional o saltar)
        const btnView = page.locator('[title="Ver detalles"] .action-icon').first();
        
        if (await btnView.isVisible()) {
            await btnView.dispatchEvent('click');
            
            // Validar que entramos a detalles
            await expect(page.locator('.compras-title')).toContainText('Detalle de Compra');
            
            // Validar botón PDF
            const btnPdf = page.locator('button:has-text("Descargar PDF")');
            await expect(btnPdf).toBeVisible();
            
            // Volver
            await page.locator('button.compras-btn-back').dispatchEvent('click');
            await expect(page.locator('.compras-title')).toContainText('Compras');
        }
    });

    test('HU_Compras_04: Completar compra', async ({ page }) => {
        // Filtrar por Pendiente si es posible
        const filterSelect = page.locator('.status-filter select, select[class*="filter"]');
        if (await filterSelect.isVisible()) {
            await filterSelect.selectOption({ label: 'Pendiente' });
            await page.waitForTimeout(1000);
        }

        const btnComplete = page.locator('[title="Marcar como completada"] .action-icon').first();
        if (await btnComplete.isVisible()) {
            await btnComplete.dispatchEvent('click');
            
            // Confirmar en el modal
            const btnConfirmar = page.locator('.delete-modal-btn-confirm, button:has-text("Completar")');
            await expect(btnConfirmar).toBeVisible({ timeout: 5000 });
            
            await Promise.all([
                page.waitForResponse(resp => resp.url().includes('/status') && resp.request().method() === 'PATCH' && resp.status() === 200, { timeout: 20000 }),
                btnConfirmar.dispatchEvent('click')
            ]);
            const alert = page.locator('.alert-container').first();
            if (await alert.isVisible({ timeout: 5000 }).catch(() => false)) {
                await expect(alert).toContainText(/éxito|completada/i, { timeout: 5000 });
            }
        }
    });

    test('HU_Compras_05: Anular compra', async ({ page }) => {
        const btnAnular = page.locator('[title="Anular compra"] .action-icon').first();
        if (await btnAnular.isVisible()) {
            await btnAnular.dispatchEvent('click');
            
            // Confirmar en el modal
            // El modal podría requerir motivo
            const inputMotivo = page.locator('textarea[placeholder*="motivo"], input[placeholder*="motivo"]');
            if (await inputMotivo.isVisible()) {
                await inputMotivo.fill('Anulación de prueba E2E');
            }
            
            const btnConfirmar = page.locator('.delete-modal-btn-confirm, button:has-text("Anular")');
            await expect(btnConfirmar).toBeVisible({ timeout: 5000 });
            
            await Promise.all([
                page.waitForResponse(resp => resp.url().includes('/anular') && resp.request().method() === 'POST' && resp.status() === 200, { timeout: 20000 }),
                btnConfirmar.dispatchEvent('click')
            ]);
            const alert = page.locator('.alert-container').first();
            if (await alert.isVisible({ timeout: 5000 }).catch(() => false)) {
                await expect(alert).toContainText(/éxito|anulada|correctamente/i, { timeout: 5000 });
            }
        }
    });

});
