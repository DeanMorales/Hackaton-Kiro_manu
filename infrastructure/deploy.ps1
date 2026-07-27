# deploy.ps1
# Script de despliegue para la infraestructura backend de Torre de las Nubes
#
# Pre-requisitos:
#   - AWS CLI instalado y configurado (aws configure)
#   - Node.js 20+ instalado
#   - Permisos IAM: CloudFormation, Lambda, DynamoDB, API Gateway, IAM, S3
#
# Uso:
#   .\infrastructure\deploy.ps1
#   .\infrastructure\deploy.ps1 -Region us-east-1 -AllowedOrigin "https://main.xxxxx.amplifyapp.com"

param(
    [string]$Region       = "us-east-1",
    [string]$StackName    = "torre-nubes-backend",
    [string]$AllowedOrigin = "*",
    [string]$TableName    = "torre-nubes-scores"
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir   = Split-Path -Parent $ScriptDir
$LambdaDir = Join-Path $RootDir "lambda"
$ZipName   = "torre-nubes-scores-api.zip"
$ZipPath   = Join-Path $ScriptDir $ZipName

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Torre de las Nubes — Deploy Backend" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Region:   $Region"
Write-Host "Stack:    $StackName"
Write-Host "Origin:   $AllowedOrigin"
Write-Host ""

# ─── Step 1: Get AWS Account ID ───────────────────────────────────────────────
Write-Host "[1/6] Obteniendo AWS Account ID..." -ForegroundColor Yellow
$AccountId = (aws sts get-caller-identity --query Account --output text --region $Region)
if ($LASTEXITCODE -ne 0) { throw "Error: No se pudo obtener Account ID. Verifica 'aws configure'." }
Write-Host "      Account ID: $AccountId" -ForegroundColor Green

# ─── Step 2: Create S3 bucket for Lambda deployment package ──────────────────
$BucketName = "torre-nubes-deploy-$AccountId-$Region"
Write-Host "[2/6] Verificando bucket S3: $BucketName ..." -ForegroundColor Yellow

$BucketExists = aws s3api head-bucket --bucket $BucketName --region $Region 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "      Creando bucket S3..." -ForegroundColor Yellow
    if ($Region -eq "us-east-1") {
        aws s3api create-bucket --bucket $BucketName --region $Region | Out-Null
    } else {
        aws s3api create-bucket --bucket $BucketName --region $Region `
            --create-bucket-configuration LocationConstraint=$Region | Out-Null
    }
    if ($LASTEXITCODE -ne 0) { throw "Error creando bucket S3." }
    # Block all public access
    aws s3api put-public-access-block --bucket $BucketName `
        --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" | Out-Null
    Write-Host "      Bucket creado." -ForegroundColor Green
} else {
    Write-Host "      Bucket ya existe." -ForegroundColor Green
}

# ─── Step 3: Install Lambda dependencies and create ZIP ──────────────────────
Write-Host "[3/6] Instalando dependencias Lambda y creando ZIP..." -ForegroundColor Yellow

Push-Location $LambdaDir
try {
    npm install --omit=dev --silent
    if ($LASTEXITCODE -ne 0) { throw "Error en npm install dentro de lambda/." }
} finally {
    Pop-Location
}

# Create ZIP from lambda/ directory (handler.js + node_modules + package.json)
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }

# Use Compress-Archive (available in PowerShell 5+)
$LambdaFiles = Get-ChildItem -Path $LambdaDir -Exclude "__tests__","*.test.js" | Select-Object -ExpandProperty FullName
Compress-Archive -Path $LambdaFiles -DestinationPath $ZipPath -Force
Write-Host "      ZIP creado: $ZipPath" -ForegroundColor Green

# ─── Step 4: Upload ZIP to S3 ─────────────────────────────────────────────────
Write-Host "[4/6] Subiendo ZIP a S3..." -ForegroundColor Yellow
aws s3 cp $ZipPath "s3://$BucketName/$ZipName" --region $Region | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Error subiendo ZIP a S3." }
Write-Host "      ZIP subido: s3://$BucketName/$ZipName" -ForegroundColor Green

# ─── Step 5: Deploy CloudFormation stack ──────────────────────────────────────
$TemplatePath = Join-Path $ScriptDir "cloudformation.yml"
Write-Host "[5/6] Desplegando CloudFormation stack '$StackName'..." -ForegroundColor Yellow

# Check if stack exists
$StackStatus = aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].StackStatus" --output text 2>&1
if ($LASTEXITCODE -eq 0 -and $StackStatus -notlike "*_FAILED") {
    Write-Host "      Stack existe ($StackStatus). Ejecutando update-stack..." -ForegroundColor Yellow
    aws cloudformation update-stack `
        --stack-name $StackName `
        --template-body "file://$TemplatePath" `
        --parameters `
            ParameterKey=LambdaS3Bucket,ParameterValue=$BucketName `
            ParameterKey=LambdaS3Key,ParameterValue=$ZipName `
            ParameterKey=AllowedOrigin,ParameterValue=$AllowedOrigin `
            ParameterKey=TableName,ParameterValue=$TableName `
        --capabilities CAPABILITY_NAMED_IAM `
        --region $Region | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "      (Sin cambios que actualizar o error)" -ForegroundColor Yellow
    } else {
        Write-Host "      Esperando actualización del stack..." -ForegroundColor Yellow
        aws cloudformation wait stack-update-complete --stack-name $StackName --region $Region
    }
} else {
    Write-Host "      Creando nuevo stack..." -ForegroundColor Yellow
    aws cloudformation create-stack `
        --stack-name $StackName `
        --template-body "file://$TemplatePath" `
        --parameters `
            ParameterKey=LambdaS3Bucket,ParameterValue=$BucketName `
            ParameterKey=LambdaS3Key,ParameterValue=$ZipName `
            ParameterKey=AllowedOrigin,ParameterValue=$AllowedOrigin `
            ParameterKey=TableName,ParameterValue=$TableName `
        --capabilities CAPABILITY_NAMED_IAM `
        --region $Region | Out-Null
    
    if ($LASTEXITCODE -ne 0) { throw "Error al crear el stack." }
    Write-Host "      Esperando creación del stack (puede tardar 2-3 min)..." -ForegroundColor Yellow
    aws cloudformation wait stack-create-complete --stack-name $StackName --region $Region
}

if ($LASTEXITCODE -ne 0) { throw "El stack falló. Revisa la consola de CloudFormation." }

# ─── Step 6: Get outputs ──────────────────────────────────────────────────────
Write-Host "[6/6] Obteniendo outputs del stack..." -ForegroundColor Yellow

$ApiUrl = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $Region `
    --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" `
    --output text

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  DESPLIEGUE COMPLETADO" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "API Gateway URL:" -ForegroundColor Cyan
Write-Host "  $ApiUrl" -ForegroundColor White
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Yellow
Write-Host "  1. Configura VITE_SCORES_API_URL=$ApiUrl en Amplify Console"
Write-Host "  2. Vuelve a ejecutar este script con -AllowedOrigin <tu-dominio-amplify>"
Write-Host "     para restringir CORS al dominio real (quitar '*')"
Write-Host "  3. Conecta el repo GitHub a Amplify Hosting (rama main)"
Write-Host ""

# Save API URL to .env.local for local testing
$EnvFile = Join-Path $RootDir ".env.local"
$EnvLine = "VITE_SCORES_API_URL=$ApiUrl"
if (Test-Path $EnvFile) {
    $Content = Get-Content $EnvFile
    if ($Content -notmatch "VITE_SCORES_API_URL") {
        Add-Content $EnvFile "`n$EnvLine"
        Write-Host "  .env.local actualizado con VITE_SCORES_API_URL" -ForegroundColor Green
    } else {
        Write-Host "  .env.local ya tiene VITE_SCORES_API_URL (actualiza manualmente si cambió)" -ForegroundColor Yellow
    }
} else {
    Set-Content $EnvFile $EnvLine
    Write-Host "  .env.local creado con VITE_SCORES_API_URL" -ForegroundColor Green
}
