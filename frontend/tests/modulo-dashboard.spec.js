import { test, expect } from './fixtures.js';

test.describe('Módulo Dashboard', () => {

    test.beforeEach(async ({ page }) => {
        // Navegamos al Dashboard antes de cada prueba
        await page.goto('http://localhost:5173/admin/dashboard', { waitUntil: 'networkidle' });
    });

    test('HU_72: Visualizar resumen de ventas (Dia, Mes, Año)', async ({ page }) => {
        // Verificamos que el título esté presente
        await expect(page.locator('h1.dashboard-label')).toHaveText(/Panel de Dashboard/i);

        // Validamos la existencia de los botones de filtro por período (Semana, Mes, Año)
        const btnSemana = page.locator('button.view-mode-btn', { hasText: 'Semana' });
        const btnMes = page.locator('button.view-mode-btn', { hasText: 'Mes' });
        const btnAno = page.locator('button.view-mode-btn', { hasText: 'Año' });

        await expect(btnSemana).toBeVisible();
        await expect(btnMes).toBeVisible();
        await expect(btnAno).toBeVisible();

        // Al hacer clic en Semana, debería aparecer el selector de semanas
        await btnSemana.dispatchEvent('click');
        await expect(page.locator('select[title="Seleccionar semana"]')).toBeVisible();

        // Al hacer clic en Año, solo debe verse el campo de año
        await btnAno.dispatchEvent('click');
        await expect(page.locator('input.slim-input-year')).toBeVisible();

        // Verificamos que el gráfico de ventas es visible (debe cargar en cualquier vista por defecto)
        const salesChartCard = page.locator('.chart-visual-box').filter({ hasText: /Ventas Registradas/i });
        await expect(salesChartCard).toBeVisible();
    });

    test('HU_73: Grafica de productos mas vendidos', async ({ page }) => {
        // Verificamos que la sección de lista de Top Productos exista
        const topProductsCard = page.locator('.chart-visual-box').filter({ hasText: /Productos más vendidos/i });
        await expect(topProductsCard).toBeVisible();
    });

    test('HU_74: Grafica de compras', async ({ page }) => {
        // Verificamos que la tarjeta del gráfico de compras exista
        const purchasesCard = page.locator('.chart-visual-box').filter({ hasText: /Compras Registradas/i });
        await expect(purchasesCard).toBeVisible();
    });

    test('HU_75, HU_76 y HU_77: Totales de Ventas, Compras y Devoluciones', async ({ page }) => {
        // Para ver los totales explícitamente en el "Resumen Comparativo", necesitamos activar el modo "Comparar"
        const compareBtn = page.locator('button.compare-toggle-btn');
        await expect(compareBtn).toBeVisible();
        
        // Hacemos clic en Comparar
        await compareBtn.dispatchEvent('click');

        // Esperamos a que aparezca la tarjeta de "Resumen Comparativo"
        const summaryCard = page.locator('.comparison-summary-card');
        await expect(summaryCard).toBeVisible();

        // HU_75: Total de ventas
        await expect(summaryCard.locator('text=Ingresos Totales (Ventas)')).toBeVisible();

        // HU_76: Total de compras
        await expect(summaryCard.locator('text=Costos Totales (Compras)')).toBeVisible();

        // HU_77: Total de devoluciones (nuestra nueva métrica agregada)
        await expect(summaryCard.locator('text=Total de Devoluciones')).toBeVisible();
    });

});
