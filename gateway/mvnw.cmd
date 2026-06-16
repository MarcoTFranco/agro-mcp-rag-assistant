@REM ----------------------------------------------------------------------------
@REM Maven Wrapper — baixa Maven automaticamente se necessário
@REM ----------------------------------------------------------------------------
@echo off
setlocal

set "MAVEN_VERSION=3.9.9"
set "MAVEN_HOME=%USERPROFILE%\.m2\wrapper\apache-maven-%MAVEN_VERSION%"
set "MVN_CMD=%MAVEN_HOME%\bin\mvn.cmd"

if exist "%MVN_CMD%" goto run

echo Baixando Apache Maven %MAVEN_VERSION%...
set "MAVEN_URL=https://archive.apache.org/dist/maven/maven-3/%MAVEN_VERSION%/binaries/apache-maven-%MAVEN_VERSION%-bin.zip"
set "MAVEN_ZIP=%TEMP%\apache-maven-%MAVEN_VERSION%-bin.zip"

powershell -Command "Invoke-WebRequest -Uri '%MAVEN_URL%' -OutFile '%MAVEN_ZIP%'"
if %ERRORLEVEL% neq 0 (
    echo Erro ao baixar Maven.
    exit /b 1
)

echo Extraindo...
powershell -Command "Expand-Archive -Path '%MAVEN_ZIP%' -DestinationPath '%USERPROFILE%\.m2\wrapper' -Force"
del "%MAVEN_ZIP%" 2>nul
echo Maven %MAVEN_VERSION% instalado em %MAVEN_HOME%

:run
set "PATH=%MAVEN_HOME%\bin;%PATH%"
call mvn %*
