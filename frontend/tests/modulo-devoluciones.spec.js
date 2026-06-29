import { test, expect } from './fixtures.js';

test.describe('Módulo Devoluciones', () => {
    
    test.beforeEach(async ({ page }) => {
        // Usamos la sesión global guardada por auth.setup.js
        await page.goto('http://localhost:5173/admin/devoluciones');
        await page.waitForLoadState('networkidle');
    });

    test('HU_Devoluciones_01: Listar y buscar devoluciones', async ({ page }) => {
        await expect(page.locator('h1')).toContainText(/Devolucion/i);
        await expect(page.locator('.entity-table')).toBeVisible();

        // 1. Buscador por texto
        const searchInput = page.locator('input[placeholder*="Buscar"]');
        if (await searchInput.isVisible()) {
            await searchInput.fill('Factura Test');
            await page.waitForTimeout(1000);
            await searchInput.fill('');
            await page.waitForTimeout(500);
        }

        // 2. Buscador por estado
        const statusFilterBtn = page.locator('.status-filter-trigger').first();
        if (await statusFilterBtn.isVisible()) {
            await statusFilterBtn.click();
            await page.waitForTimeout(500);
            
            // Seleccionar "Pendiente" o estado aplicable
            const filterOption = page.locator('.filter-option-item:has-text("Pendiente")').first();
            if (await filterOption.isVisible()) {
                await filterOption.click();
                await page.waitForTimeout(1000);
            }
            
            // Volver a "Todos"
            await statusFilterBtn.click();
            await page.waitForTimeout(500);
            await page.locator('.filter-option-item:has-text("Todos")').first().click();
            await page.waitForTimeout(500);
        }
    });

    test('HU_Devoluciones_02: Ver detalle de devolución', async ({ page }) => {
        const btnView = page.locator('.action-view').first();
        if (await btnView.isVisible()) {
            await btnView.dispatchEvent('click');
            
            await expect(page.locator('text=/Detalle/i').first()).toBeVisible({ timeout: 10000 });
            
            const btnBack = page.locator('button.devoluciones-btn-back, button:has-text("Volver")');
            if (await btnBack.isVisible()) await btnBack.dispatchEvent('click');
        }
    });

    test('HU_Devoluciones_03: Aprobar devolución', async ({ page }) => {
        const btnApprove = page.locator('.action-approve').first();
        if (await btnApprove.isVisible()) {
            await btnApprove.dispatchEvent('click');
            
            const btnConfirmar = page.locator('.delete-modal-btn-confirm, button:has-text("Aprobar")');
            if (await btnConfirmar.isVisible()) {
                await Promise.all([
                    page.waitForResponse(resp => resp.url().includes('/api/devoluciones') && resp.request().method() === 'PUT' && resp.status() === 200),
                    expect(page.locator('.alert-container').first()).toContainText(/éxito|aprobada/i, { timeout: 10000 }),
                    btnConfirmar.dispatchEvent('click')
                ]);
            }
        }
    });

    test('HU_Devoluciones_04: Rechazar devolución', async ({ page }) => {
        const btnReject = page.locator('.action-reject').first();
        if (await btnReject.isVisible()) {
            await btnReject.dispatchEvent('click');
            
            const inputMotivo = page.locator('textarea[placeholder*="motivo"], input[placeholder*="motivo"]');
            if (await inputMotivo.isVisible()) {
                await inputMotivo.fill('Rechazo por prueba E2E');
            }

            const btnConfirmar = page.locator('.delete-modal-btn-confirm, button:has-text("Rechazar")');
            if (await btnConfirmar.isVisible()) {
                await Promise.all([
                    page.waitForResponse(resp => resp.url().includes('/api/devoluciones') && resp.request().method() === 'PUT' && resp.status() === 200),
                    expect(page.locator('.alert-container').first()).toContainText(/éxito|rechazada/i, { timeout: 10000 }),
                    btnConfirmar.dispatchEvent('click')
                ]);
            }
        }
    });
});
