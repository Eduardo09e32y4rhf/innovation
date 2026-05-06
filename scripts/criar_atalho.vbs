Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = "C:\Users\eduar\Desktop\Innovation RH.lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "C:\Users\eduar\Desktop\innovation.ia\WHATSAPP\InnovationApp\innovationv6.exe"
oLink.WorkingDirectory = "C:\Users\eduar\Desktop\innovation.ia\WHATSAPP\InnovationApp"
oLink.Description = "Innovation RH Desktop"
oLink.Save
