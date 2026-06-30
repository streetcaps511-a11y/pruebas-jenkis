// @ts-check
const { defineConfig, devices } = require('@playwright/test');

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
        actionTimeout: 30000,
        navigationTimeout: 45000,
        headless: process.env.CI ? true : false,
    },

    // ─── PROYECTOS ───────────────────────────────────────────────────────────────
    projects: [
        // 🔐 SETUP – siempre primero
        {
            name: 'setup',
            testMatch: /.*\.setup\.js/,
        },

        // 🌐 CHROMIUM – corre primero
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                storageState: './.auth/user.json',
            },
            dependencies: ['setup'],
        },

        // 🦊 FIREFOX – espera a chromium
        {
            name: 'firefox',
            use: {
                ...devices['Desktop Firefox'],
                storageState: './.auth/user.json',
            },
            dependencies: ['chromium'],
        },

        // 🍎 WEBKIT – espera a firefox
        {
            name: 'webkit',
            use: {
                ...devices['Desktop Safari'],
                storageState: './.auth/user.json',
            },
            dependencies: ['firefox'],
        },
    ],

    // ─── SERVIDOR WEB ────────────────────────────────────────────────────────────
    webServer: [
        {
            command: 'npm run dev',
            url: 'http://localhost:5173',
            cwd: './frontend',
            reuseExistingServer: true,
            timeout: 60000,
        },
        {
            command: 'npm start',
            url: 'http://localhost:3000',
            cwd: './backend',
            reuseExistingServer: true,
            timeout: 60000,
        }
    ],
});