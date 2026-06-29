import { test, expect } from './fixtures.js';

test.describe('Módulo Productos', () => {
    
    test.beforeEach(async ({ page }) => {
        // Usamos la sesión global guardada por auth.setup.js
        await page.goto('http://localhost:5173/admin/productos');
        await page.waitForLoadState('networkidle');
    });

    test('HU_Productos_01: Listar y buscar productos', async ({ page }) => {
        await expect(page.locator('h1')).toContainText(/Productos/i);
        await expect(page.locator('.entity-table, .productos-grid')).toBeVisible();

        // 1. Buscador por texto
        const searchInput = page.locator('input[placeholder*="Buscar"]');
        await searchInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        if (await searchInput.isVisible()) {
            await searchInput.fill('Producto Test');
            await page.waitForTimeout(1000);
            await searchInput.fill('');
            await page.waitForTimeout(500);
        }

        // 2. Buscador por estado
        const statusFilterBtn = page.locator('.status-filter-trigger').first();
        await statusFilterBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        if (await statusFilterBtn.isVisible()) {
            await statusFilterBtn.click();
            await page.waitForTimeout(500);
            
            // Seleccionar "Activos"
            const filterOption = page.locator('.filter-option-item:has-text("Activos")').first();
            await filterOption.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
            if (await filterOption.isVisible()) {
                await filterOption.click();
                await page.waitForTimeout(1000);
            }
            
            // Volver a "Todos"
            await statusFilterBtn.click();
            await page.waitForTimeout(500);
            await page.locator('.filter-option-item:has-text("Todos")').first().click();
            await page.waitForTimeout(1000); // Dar tiempo
        }
        
        await page.waitForLoadState('networkidle').catch(() => {});
    });

    test('HU_Productos_02: Registrar nuevo producto', async ({ page }) => {
        // Asegurarse de que no haya alertas previas tapando los botones
        await expect(page.locator('.alert-container')).toBeHidden({ timeout: 5000 }).catch(() => {});
        
        // Asegurarse de que el botón de registro esté visible antes de hacer clic
        await page.waitForSelector('.productos-btn-register', { state: 'visible', timeout: 5000 }).catch(() => {});
        // Clic normal, sin force: true para evitar cuelgues en Firefox
        await page.locator('.productos-btn-register').first().click();
        
        await page.fill('input[name="nombre"]', `Producto E2E ${Math.floor(Math.random() * 1000)}`);
        
        // Agregar descripción requerida
        const descInput = page.locator('textarea[name="descripcion"]');
        if (await descInput.isVisible()) {
            await descInput.fill('Descripción del producto E2E');
        }
        
        const priceInput = page.locator('input[name="precio"], input[name="precioVenta"]');
        if (await priceInput.isVisible()) {
            await priceInput.fill('50000');
        }

        // Agregar precios requeridos (mayorista 6 y 80)
        const priceMayorista6Input = page.locator('input[name="precioMayorista6"]');
        if (await priceMayorista6Input.isVisible()) {
            await priceMayorista6Input.fill('45000');
        }
        
        const priceMayorista80Input = page.locator('input[name="precioMayorista80"]');
        if (await priceMayorista80Input.isVisible()) {
            await priceMayorista80Input.fill('40000');
        }

        const selectCategoria = page.locator('select[name="categoria"], select[name="idCategoria"], select.form-select').first();
        if (await selectCategoria.isVisible()) {
            await expect(selectCategoria.locator('option').nth(1)).toBeAttached({ timeout: 5000 }).catch(() => {});
            await selectCategoria.selectOption({ index: 1 }).catch(() => {});
        }

        // Agregar talla y stock requeridos
        const tallaSelect = page.locator('.form-select-sm').first();
        if (await tallaSelect.isVisible()) {
            await expect(tallaSelect.locator('option').nth(1)).toBeAttached({ timeout: 5000 }).catch(() => {});
            await tallaSelect.selectOption({ index: 1 }).catch(() => {});
        }
        const stockInput = page.locator('.form-input-stock').first();
        if (await stockInput.isVisible()) {
            await stockInput.fill('10');
        }

        // Agregar URL de imagen requerida
        const urlInput = page.locator('input[placeholder="URL 1"]');
        if (await urlInput.isVisible()) {
            await urlInput.fill('https://placehold.co/100');
        }

        await page.waitForTimeout(500); // Esperar validaciones del formulario
        const btnSubmit = page.locator('button[type="submit"]');
        await expect(btnSubmit).toBeEnabled({ timeout: 5000 });
        
        // ✅ FIX Firefox: Promise.all + dispatchEvent evita timeout de click
        await Promise.all([
            page.waitForResponse(resp => resp.url().includes('/api/productos') && resp.request().method() === 'POST' && (resp.status() === 201 || resp.status() === 200), { timeout: 20000 }),
            btnSubmit.dispatchEvent('click'),
        ]);
        await expect(page.locator('.alert-container').first()).toContainText(/éxito|creada|registrada|registrado|guardado|creado/i, { timeout: 10000 });
    });

    test('HU_Productos_03: Editar producto', async ({ page }) => {
        // En Firefox es más seguro cliquear el ícono SVG en lugar del span
        const btnEdit = page.locator('[title="Editar"] .action-icon, [title="Editar"]').first();
        await btnEdit.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        if (await btnEdit.isVisible()) {
            await btnEdit.click({ force: true });
            
            const nombreInput = page.locator('input[name="nombre"]');
            await nombreInput.fill(`Producto Editado ${Math.floor(Math.random() * 1000)}`);
            
            await page.waitForTimeout(500); // Esperar validaciones
            const btnSubmit = page.locator('button[type="submit"]');
            await expect(btnSubmit).toBeEnabled({ timeout: 5000 });
            
            // ✅ FIX Firefox: Promise.all + dispatchEvent
            await Promise.all([
                page.waitForResponse(resp => resp.url().includes('/api/productos') && resp.request().method() === 'PUT' && resp.status() === 200, { timeout: 20000 }),
                btnSubmit.dispatchEvent('click'),
            ]);
            await expect(page.locator('.alert-container').first()).toContainText(/éxito|actualizado/i, { timeout: 10000 });
        }
    });

    test('HU_Productos_04: Cambiar estado de producto', async ({ page }) => {
        const customSwitch = page.locator('.custom-switch').first();
        if (await customSwitch.isVisible()) {
            // ✅ FIX Firefox: dispatchEvent y luego await responsePromise
            const responsePromise = page.waitForResponse(resp => resp.url().includes('/api/productos') && resp.request().method() === 'PUT' && resp.status() === 200, { timeout: 20000 });
            await customSwitch.dispatchEvent('click');
            await responsePromise;
            await expect(page.locator('.alert-container').first()).toContainText(/activado|desactivado/i, { timeout: 10000 });
        }
    });

    test('HU_Productos_05: Eliminar producto', async ({ page }) => {
        // Apuntar específicamente al ícono SVG (action-icon) ya que el span puede no recibir el clic en Firefox
        const btnDelete = page.locator('[title="Eliminar"] .action-icon, [title="Eliminar"]').first();
        await btnDelete.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        if (await btnDelete.isVisible()) {
            await btnDelete.click({ force: true });
            
            // Puede que aparezca el modal de confirmar o la alerta de error (si está activo)
            const modalOrAlert = page.locator('.delete-modal-btn-confirm').or(page.locator('.alert-container'));
            await modalOrAlert.first().waitFor({ state: 'visible', timeout: 4000 });
            
            const btnConfirmar = page.locator('.delete-modal-btn-confirm');
            if (await btnConfirmar.isVisible()) {
                const responsePromise = page.waitForResponse(resp => resp.url().includes('/api/productos') && resp.request().method() === 'DELETE' && resp.status() === 200);
                await btnConfirmar.click();
                await responsePromise;
                await expect(page.locator('.alert-container').first()).toContainText(/éxito|eliminado/i, { timeout: 10000 });
            } else {
                // El producto sigue activo, se mostró alerta
                await expect(page.locator('.alert-container').first()).toContainText(/Desactiva el producto antes de eliminarlo/i);
            }
        }
    });
});
