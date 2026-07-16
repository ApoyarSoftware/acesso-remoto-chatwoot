Set shell = CreateObject("WScript.Shell")
Set args = WScript.Arguments
If args.Count > 0 Then
    ' O parametro 0 no final diz para o Windows executar de forma totalmente invisivel (sem piscar tela preta)
    shell.Run "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File ""C:\Quality\launch.ps1"" """ & args(0) & """", 0, False
End If
