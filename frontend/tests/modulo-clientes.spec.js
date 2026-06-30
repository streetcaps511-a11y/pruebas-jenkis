import { test, expect } from './fixtures.js';

test.describe('Módulo Clientes', () => {
    
    test.beforeEach(async ({ page }) => {
        // Usamos la sesión global guardada por auth.setup.js
        await page.goto('http://localhost:5173/admin/clientes');
        await page.waitForLoadState('networkidle');
    });

    test('HU_Clientes_01: Listar y buscar clientes', async ({ page }) => {
        await expect(page.locator('h1')).toContainText(/Clientes/i);
        await expect(page.locator('.entity-table')).toBeVisible();

        // 1. Buscador por texto
        const searchInput = page.locator('input[placeholder*="Buscar"]');
        if (await searchInput.isVisible()) {
            await searchInput.fill('Cliente Test');
            await page.waitForTimeout(1000);
            await searchInput.fill('');
            await page.waitForTimeout(500);
        }

        // 2. Buscador por estado
        const statusFilterBtn = page.locator('.status-filter-trigger').first();
        if (await statusFilterBtn.isVisible()) {
            await statusFilterBtn.dispatchEvent('click');
            await page.waitForTimeout(500);
            
            // Seleccionar "Activos"
            const filterOption = page.locator('.filter-option-item:has-text("Activos")').first();
            if (await filterOption.isVisible()) {
                await filterOption.dispatchEvent('click');
                await page.waitForTimeout(1000);
            }
            
            // Volver a "Todos"
            await statusFilterBtn.dispatchEvent('click');
            await page.waitForTimeout(500);
            await page.locator('.filter-option-item:has-text("Todos")').first().dispatchEvent('click');
            await page.waitForTimeout(500);
        }
    });

    test('HU_Clientes_02: Registrar nuevo cliente', async ({ page }) => {
        const btnRegistrar = page.locator('button:has-text("Nuevo Cliente"), button:has-text("Registrar Cliente")').first();
        await btnRegistrar.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
        await btnRegistrar.dispatchEvent('click');
        
        await page.selectOption('select[name="documentType"]', 'Cédula de Ciudadanía');
        await page.fill('input[name="fullName"]', 'Cliente E2E');
        await page.fill('input[name="documentNumber"]', `1${Math.floor(Math.random() * 10000000)}`);
        await page.fill('input[name="email"]', `cliente${Math.floor(Math.random() * 10000)}@test.com`);
        await page.fill('input[name="city"]', 'Medellín');
        await page.fill('input[type="tel"], input[placeholder="Número"]', '3001234567');
        await page.fill('input[name="address"]', 'Calle 123');

        const btnGuardar = page.locator('button:has-text("Guardar")');
        await Promise.all([
            page.waitForResponse(resp => resp.url().includes('/api/clientes') && resp.request().method() === 'POST' && (resp.status() === 201 || resp.status() === 200), { timeout: 20000 }),
            expect(page.locator('.alert-container').first()).toContainText(/éxito|creado|registrado/i, { timeout: 10000 }),
            btnGuardar.dispatchEvent('click'),
        ]);
    });

    test('HU_Clientes_03: Editar cliente', async ({ page }) => {
        const btnEdit = page.locator('[title="Editar"]').first();
        if (await btnEdit.isVisible()) {
            await btnEdit.click({ force: true });
            
            const nombreInput = page.locator('input[name="fullName"]');
            await nombreInput.fill('Cliente E2E Editado');
            
            const btnGuardarEdit = page.locator('button:has-text("Guardar")');
            await Promise.all([
                page.waitForResponse(resp => resp.url().includes('/api/clientes') && resp.request().method() === 'PUT' && resp.status() === 200, { timeout: 20000 }),
                expect(page.locator('.alert-container').first()).toContainText(/éxito|actualizado/i, { timeout: 10000 }),
                btnGuardarEdit.dispatchEvent('click'),
            ]);
        }
    });

    test('HU_Clientes_04: Cambiar estado del cliente', async ({ page }) => {
        const customSwitch = page.locator('.custom-switch').first();
        if (await customSwitch.isVisible()) {
            await Promise.all([
                page.waitForResponse(resp => resp.url().includes('/estado') && resp.request().method() === 'PATCH' && resp.status() === 200, { timeout: 20000 }),
                expect(page.locator('.alert-container').first()).toContainText(/activado|desactivado|éxito/i, { timeout: 10000 }),
                customSwitch.dispatchEvent('click'),
            ]);
        }
    });

    test('HU_Clientes_05: Eliminar cliente', async ({ page }) => {
        // Buscar específicamente una fila inactiva para evitar la restricción de negocio
        const row = page.locator('tr', { has: page.locator('.status-badge.inactive, td:has-text("Inactivo")') }).first();
        
        // Si no hay inactivos, tomamos la primera fila de datos (nth(1) ya que nth(0) es el thead tr si no usamos tbody tr)
        let targetRow = row;
        if (!(await row.isVisible())) {
            targetRow = page.locator('tbody tr').first();
        }
        
        const btnDelete = targetRow.locator('.btn-delete').first();

        if (await btnDelete.isVisible()) {
            await btnDelete.click({ force: true });
            
            const btnConfirmar = page.locator('.delete-modal-btn-confirm, button:has-text("Eliminar")');
            await expect(btnConfirmar).toBeVisible({ timeout: 5000 });
            
            await Promise.all([
                page.waitForResponse(resp => resp.url().includes('/api/clientes') && resp.request().method() === 'DELETE' && resp.status() === 200, { timeout: 20000 }),
                expect(page.locator('.alert-container').first()).toContainText(/éxito|eliminado/i, { timeout: 10000 }),
                btnConfirmar.dispatchEvent('click'),
            ]);
        }
    });
});
