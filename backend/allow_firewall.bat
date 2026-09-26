@echo off
echo ===================================================
echo Configuring Windows Firewall for KING STING Mobile Node
echo ===================================================
netsh advfirewall firewall add rule name="KING_STING_VULNSCANNER_8765" dir=in action=allow protocol=TCP localport=8765 profile=any
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Private"
echo Done! Inbound port 8765 is now enabled for mobile phones.
timeout /t 3
