@echo off
title Iniciar Acessos Remotos - Dev
echo ==================================================
echo   INICIANDO AMBIENTE DE DESENVOLVIMENTO LOCAL
echo ==================================================
echo.

:: Iniciar o Backend em um novo terminal
echo [1/2] Iniciando Servidor Backend (Porta 5000)...
start "Acessos Remotos - Backend" cmd /k "cd backend && npm run dev"

:: Aguarda 2 segundos para dar tempo do backend subir
timeout /t 2 /nobreak >nul

:: Iniciar o Frontend em um novo terminal
echo [2/2] Iniciando Servidor Frontend (Porta 5173)...
start "Acessos Remotos - Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ==================================================
echo   Backend e Frontend foram iniciados em novas telas!
echo   Acesse: http://localhost:5173/?cnpj=12345678000199
echo ==================================================
echo.
pause
