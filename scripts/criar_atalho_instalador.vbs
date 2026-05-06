Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = "C:\Users\eduar\Desktop\Innovation RH (Instalador).lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "C:\Users\eduar\Desktop\Installer_Output_NSIS\Instalador_Innovation_Atom.exe"
oLink.WorkingDirectory = "C:\Users\eduar\Desktop\Installer_Output_NSIS"
oLink.Description = "Instalar Innovation RH"
oLink.Save
