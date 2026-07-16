@echo off
title Popular Banco de Dados Local
echo ==================================================
echo   POPULANDO BANCO DE DADOS LOCAL COM DADOS FAKE
echo ==================================================
echo.

cd /d "%~dp0\backend"
cmd /c "node src/seed.js"

echo.
echo ==================================================
echo   Processo de seed concluido!
echo ==================================================
pause
