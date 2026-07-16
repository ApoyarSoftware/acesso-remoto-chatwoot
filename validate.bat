@echo off
title Validar Frontend
echo ==================================================
echo   VALIDANDO FRONTEND (LINT ^& BUILD)
echo ==================================================
echo.

:: Salva o diretório atual
set "ORIGINAL_DIR=%CD%"

:: Navega para a pasta do frontend
cd /d "%~dp0\frontend"

echo [1/2] Executando Linter (Oxlint)...
cmd /c "npm run lint"
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] O linter encontrou problemas no codigo!
    cd /d "%ORIGINAL_DIR%"
    exit /b 1
)

echo.
echo [2/2] Testando Compilacao (Vite Build)...
cmd /c "npm run build"
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Falha ao compilar o frontend!
    cd /d "%ORIGINAL_DIR%"
    exit /b 1
)

echo.
echo ==================================================
echo   [OK] Frontend validado com sucesso!
echo ==================================================
cd /d "%ORIGINAL_DIR%"
exit /b 0
