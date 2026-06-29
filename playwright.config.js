// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * PLAYWRIGHT CONFIG – QA Automation (ReactJS + NodeJS + PostgreSQL)
 * Git Flow: main / develop / feature/* / release/* / hotfix/*
 *
 * Estrategia:
 *  1. El proyecto 'setup' se ejecuta PRIMERO y genera .auth/user.json
 *  2. Los proyectos de browsers consumen ese estado para evitar re-login
 */
module.exports = defineConfig({
    // ─── DIRECTORIOS ────────────────────────────────────────────────────────────
    testDir: './frontend/tests',

    // ─── PARALELISMO ────────────────────────────────────────────────────────────
    fullyParallel: false,
    workers: 1,

    // ─── ESTABILIDAD ────────────────────────────────────────────────────────────
    retries: 1,
    forbidOnly: !!process.env.CI,

    // ─── REPORTES ───────────────────────────────────────────────────────────────
    reporter: [
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
        ['list'],
    ],

    // ─── CONFIGURACIÓN GLOBAL ────────────────────────────────────────────────────
    timeout: 60000,
    use: {
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        actionTimeout: 15000,
        navigationTimeout: 30000,
        headless: false,
    },

    // ─── PROYECTOS ───────────────────────────────────────────────────────────────
    projects: [
        // 🔐 SETUP DE AUTENTICACIÓN – se ejecuta SIEMPRE PRIMERO
        {
            name: 'setup',
            testMatch: /.*\.setup\.js/,
        },

        // 🌐 CHROMIUM – principal (CI/CD)
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                storageState: './.auth/user.json',   // ← raíz del proyecto
            },
            dependencies: ['setup'],
        },

        // 🦊 FIREFOX – cross-browser
        {
            name: 'firefox',
            use: {
                ...devices['Desktop Firefox'],
                storageState: './.auth/user.json',
            },
            dependencies: ['setup'],
        },

        // 🍎 WEBKIT (Safari) – cross-browser
        {
            name: 'webkit',
            use: {
                ...devices['Desktop Safari'],
                storageState: './.auth/user.json',
            },
            dependencies: ['setup'],
        },
    ],

    // ─── SERVIDOR WEB ────────────────────────────────────────────────────────────
    webServer: [
        {
            command: 'npm run dev',
            url: 'http://localhost:5173',
            cwd: './frontend',
            reuseExistingServer: true,   // ← reutiliza el dev server ya activo
            timeout: 60000,
        },
        {
            command: 'npm start',
            url: 'http://localhost:3000',
            cwd: './backend',
            reuseExistingServer: true,   // ← reutiliza el servidor de backend ya activo
            timeout: 60000,
        }
    ],
});