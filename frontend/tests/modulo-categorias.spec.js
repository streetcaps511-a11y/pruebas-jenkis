import { test, expect } from './fixtures.js';

test.describe('Módulo Categorias', () => {
    
    test.beforeEach(async ({ page }) => {
        // Usamos la sesión global guardada por auth.setup.js
        await page.goto('http://localhost:5173/admin/categorias');
        await page.waitForLoadState('networkidle');
    });

    test('HU_Categorias_01: Listar y buscar categorías', async ({ page }) => {
        await expect(page.locator('h1')).toContainText(/Categor/i);
        await expect(page.locator('.entity-table')).toBeVisible();

        // 1. Buscador por texto
        const searchInput = page.locator('input[placeholder*="Buscar"]');
        await searchInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        if (await searchInput.isVisible()) {
            await searchInput.fill('Categoria Test');
            await page.waitForTimeout(1000);
            await searchInput.fill('');
            await page.waitForTimeout(500);
        }

        // 2. Buscador por estado
        const statusFilterBtn = page.locator('.status-filter-trigger').first();
        await statusFilterBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        if (await statusFilterBtn.isVisible()) {
            await statusFilterBtn.dispatchEvent('click');
            await page.waitForTimeout(500);
            
            // Seleccionar "Activos"
            const filterOption = page.locator('.filter-option-item:has-text("Activos")').first();
            await filterOption.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
            if (await filterOption.isVisible()) {
                await filterOption.dispatchEvent('click');
                await page.waitForTimeout(1000);
            }
            
            // Volver a "Todos"
            await statusFilterBtn.dispatchEvent('click');
            await page.waitForTimeout(500);
            await page.locator('.filter-option-item:has-text("Todos")').first().dispatchEvent('click');
            await page.waitForTimeout(1000);
        }
        
        // Esperar que la red se estabilice (Firefox bug)
        await page.waitForLoadState('networkidle').catch(() => {});
    });

    test('HU_Categorias_02: Registrar nueva categoría', async ({ page }) => {
        await page.click('button:has-text("Nueva Categoría"), button:has-text("Registrar Categoría")');
        
        await page.fill('input[name="nombre"]', `Categoría E2E ${Math.floor(Math.random() * 1000)}`);
        const descInput = page.locator('textarea[name="descripcion"], input[name="descripcion"]');
        if (await descInput.isVisible()) {
            await descInput.fill('Descripción de prueba automatizada');
        }

        const imageInput = page.locator('input[placeholder*="url" i], input[placeholder*="imagen" i]').first();
        await imageInput.waitFor({ state: 'visible', timeout: 5000 });
        await imageInput.fill('https://via.placeholder.com/150');

        // Esperar validaciones del formulario
        await page.waitForTimeout(500);
        const btnSubmit = page.locator('button[type="submit"]');
        await expect(btnSubmit).toBeEnabled({ timeout: 5000 });
        
        await Promise.all([
            page.waitForResponse(
                resp => resp.url().includes('/api/categorias') &&
                        resp.request().method() === 'POST' &&
                        (resp.status() === 201 || resp.status() === 200),
                { timeout: 20000 }
            ),
            btnSubmit.click({ force: true }),
        ]);
        await expect(page.locator('.alert-container').first()).toContainText(/éxito|creada|registrada|guardado/i, { timeout: 10000 });
    });

    test('HU_Categorias_03: Editar categoría', async ({ page }) => {
        const btnEdit = page.locator('[title="Editar"]').first();
        if (await btnEdit.isVisible()) {
            await btnEdit.click();
            
            const nombreInput = page.locator('input[name="nombre"]');
            await nombreInput.fill(`Cat Editada ${Math.floor(Math.random() * 1000)}`);
            
            // Esperar validaciones
            await page.waitForTimeout(500);
            const btnSubmit = page.locator('button[type="submit"]');
            await expect(btnSubmit).toBeEnabled({ timeout: 5000 });
            
            await Promise.all([
                page.waitForResponse(
                    resp => resp.url().includes('/api/categorias') &&
                            resp.request().method() === 'PUT' &&
                            resp.status() === 200,
                    { timeout: 20000 }
                ),
                btnSubmit.click({ force: true }),
            ]);
            await expect(page.locator('.alert-container').first()).toContainText(/éxito|actualizada|guardado/i, { timeout: 10000 });
        }
    });

    test('HU_Categorias_04: Cambiar estado de categoría', async ({ page }) => {
        const customSwitch = page.locator('.custom-switch').first();
        if (await customSwitch.isVisible()) {
            await customSwitch.click({ force: true });
            
            const btnConfirmar = page.locator('.delete-modal-btn-confirm, button:has-text("Confirmar"), button:has-text("Sí")');
            await btnConfirmar.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
            
            if (await btnConfirmar.isVisible()) {
                await page.waitForTimeout(500); // Esperar animación del modal
                await Promise.all([
                    page.waitForResponse(
                        resp => resp.url().includes('/estado') &&
                                resp.request().method() === 'PATCH' &&
                                resp.status() === 200,
                        { timeout: 20000 }
                    ),
                    btnConfirmar.click({ force: true }),
                ]);
                await expect(page.locator('.alert-container').first()).toContainText(/éxito|estado/i, { timeout: 10000 });
            }
        }
    });

    test('HU_Categorias_05: Eliminar categoría', async ({ page }) => {
        // Buscar fila inactiva para evitar validación de backend
        await page.waitForTimeout(1000);
        const rows = page.locator('tbody tr');
        await expect(rows.first()).toBeVisible({ timeout: 5000 });
        
        const inactiveRow = page.locator('tr', { has: page.locator('.status-badge.inactive, td:has-text("Inactivo")') }).first();
        let targetRow = inactiveRow;
        if (!(await inactiveRow.isVisible())) {
            targetRow = rows.first();
        }

        const btnDelete = targetRow.locator('.delete-btn, [title="Eliminar"]').first();
        if (await btnDelete.isVisible()) {
            await btnDelete.click({ force: true });
            
            const btnConfirmar = page.locator('.delete-modal-btn-confirm, button:has-text("Eliminar")');
            await expect(btnConfirmar).toBeVisible({ timeout: 5000 });
            
            await page.waitForTimeout(500); // Esperar animación del modal
            await Promise.all([
                page.waitForResponse(
                    resp => resp.url().includes('/api/categorias') &&
                            resp.request().method() === 'DELETE' &&
                            resp.status() === 200,
                    { timeout: 20000 }
                ),
                btnConfirmar.click({ force: true }),
            ]);
            await expect(page.locator('.alert-container').first()).toContainText(/éxito|eliminad/i, { timeout: 10000 });
        }
    });
});
