/**
 * FIXTURE GLOBAL DE AUTENTICACIÓN
 *
 * Problema: Playwright storageState guarda cookies y localStorage,
 * pero esta app React usa sessionStorage para el token JWT.
 *
 * Solución: Usamos addInitScript para inyectar sessionStorage ANTES
 * de que React monte el componente, en cada página que el test abra.
 */
import { test as base } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const sessionFile = join(__dirname, '..', '..', '.auth', 'session.json');

export const test = base.extend({
    page: async ({ page }, use) => {
        // Leer los datos de sesión guardados por auth.setup.js
        if (fs.existsSync(sessionFile)) {
            const { userData, token, refreshToken } = JSON.parse(
                fs.readFileSync(sessionFile, 'utf-8')
            );

            // Inyectar sessionStorage ANTES de que cargue cualquier página
            await page.addInitScript(({ userData, token, refreshToken }) => {
                sessionStorage.setItem('user',  JSON.stringify(userData));
                sessionStorage.setItem('token', token);
                if (refreshToken) {
                    sessionStorage.setItem('refreshToken', refreshToken);
                }
            }, { userData, token, refreshToken });
        }

        // eslint-disable-next-line react-hooks/rules-of-hooks
        await use(page);
    },
});

export { expect } from '@playwright/test';
