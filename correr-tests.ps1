$modulos = @(
    "modulo-acceso",
    "modulo-categorias",
    "modulo-clientes",
    "modulo-compras",
    "modulo-dashboard",
    "modulo-devoluciones",
    "modulo-pedidos",
    "modulo-perfil",
    "modulo-productos",
    "modulo-proveedores",
    "modulo-roles",
    "modulo-usuarios",
    "modulo-ventas"
)

foreach ($modulo in $modulos) {
    Write-Host "Corriendo $modulo..." -ForegroundColor Cyan
    npx playwright test "$modulo.spec.js" --reporter=html
    $carpeta = "reportes\$modulo"
    New-Item -ItemType Directory -Force -Path $carpeta
    Copy-Item "playwright-report\index.html" "$carpeta\index.html"
    Write-Host "✅ Reporte guardado en $carpeta" -ForegroundColor Green
}

Write-Host "✅ Todos los reportes guardados en la carpeta reportes\" -ForegroundColor Yellow