param([string]$url)

# Log para debug na pasta de logs do Quality
$logDir = "C:\Quality\LOG"
if (!(Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$logFile = "$logDir\protocol.log"
Get-Date | Out-File -FilePath $logFile -Append
"URL recebida: $url" | Out-File -FilePath $logFile -Append

if ($url -match "quality://login/?\?user=([^&]+)&pass=(.+)") {
    $rawUser = $Matches[1]
    $rawPass = $Matches[2]

    # Decodifica URL-encoded characters (ex: %40 para @) usando o Uri helper nativo do .NET
    $user = [System.Uri]::UnescapeDataString($rawUser)
    $pass = [System.Uri]::UnescapeDataString($rawPass)

    $credPath = "$env:APPDATA\Quality\Bin\Credenciais.txt"
    $exePath = "C:\Quality\web\QualityPosto.exe"

    $jsonData = @{
        SENHA_DO_DIA = ""
        DATA_ULTIMO_LOGIN = (Get-Date -Format "dd/MM/yyyy")
        USER = $user
        PASS = $pass
    }

    # Preserva SENHA_DO_DIA se o arquivo existir
    if (Test-Path $credPath) {
        try {
            $content = Get-Content -Path $credPath -Raw
            if ($content) {
                $decodedBytes = [System.Convert]::FromBase64String($content.Trim())
                $decodedJson = [System.Text.Encoding]::UTF8.GetString($decodedBytes) | ConvertFrom-Json
                if ($decodedJson.SENHA_DO_DIA) {
                    $jsonData.SENHA_DO_DIA = $decodedJson.SENHA_DO_DIA
                }
            }
        } catch {
            "Erro ao ler credenciais antigas: $_" | Out-File -FilePath $logFile -Append
        }
    }

    # Garante que a pasta existe
    $binDir = Split-Path -Path $credPath
    if (!(Test-Path $binDir)) { New-Item -ItemType Directory -Path $binDir | Out-Null }

    # Serializa e codifica em Base64
    $jsonString = ConvertTo-Json -InputObject $jsonData -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonString)
    $base64 = [System.Convert]::ToBase64String($bytes)

    # Escreve o arquivo sem quebras de linha
    [System.IO.File]::WriteAllText($credPath, $base64)

    # Executa o aplicativo
    if (Test-Path $exePath) {
        Start-Process -FilePath $exePath
        "QualityPosto executado com sucesso!" | Out-File -FilePath $logFile -Append
    } else {
        "ERRO: Executavel nao encontrado em $exePath" | Out-File -FilePath $logFile -Append
    }
} else {
    "URL invalida ou formato incorreto." | Out-File -FilePath $logFile -Append
}
