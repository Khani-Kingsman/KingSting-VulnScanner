import subprocess
import re
import os
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from app.models.scan import TargetDevice, ScanModule

# Path to self-contained adb.exe
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ADB_PATH = BACKEND_DIR / "tools" / "platform-tools" / "adb.exe"

def get_adb_command() -> str:
    if ADB_PATH.exists():
        return str(ADB_PATH)
    return "adb"

def detect_android_devices() -> List[TargetDevice]:
    """Queries real ADB daemon and Windows PnP to detect connected Android devices."""
    devices: List[TargetDevice] = []
    adb_bin = get_adb_command()

    # 1. Run adb devices -l
    try:
        res = subprocess.run([adb_bin, "devices", "-l"], capture_output=True, text=True, timeout=5)
        lines = res.stdout.strip().splitlines()
        for line in lines[1:]:
            line = line.strip()
            if not line or line.startswith("*"):
                continue

            parts = line.split()
            serial = parts[0]
            status_str = parts[1] if len(parts) > 1 else "unknown"

            # Parse model & product tags
            model = "Android Device"
            vendor = "Android"
            model_match = re.search(r"model:([^\s]+)", line)
            device_match = re.search(r"device:([^\s]+)", line)
            if model_match:
                model = model_match.group(1).replace("_", " ")

            is_online = status_str == "device"
            os_ver = "Unknown Android"
            patch_date = None

            if is_online:
                try:
                    p_ver = subprocess.run([adb_bin, "-s", serial, "shell", "getprop", "ro.build.version.release"], capture_output=True, text=True, timeout=3)
                    if p_ver.stdout.strip():
                        os_ver = f"Android {p_ver.stdout.strip()}"
                    
                    p_patch = subprocess.run([adb_bin, "-s", serial, "shell", "getprop", "ro.build.version.security_patch"], capture_output=True, text=True, timeout=3)
                    if p_patch.stdout.strip():
                        patch_date = p_patch.stdout.strip()
                        os_ver += f" (Patch: {patch_date})"

                    p_mfg = subprocess.run([adb_bin, "-s", serial, "shell", "getprop", "ro.product.manufacturer"], capture_output=True, text=True, timeout=3)
                    if p_mfg.stdout.strip():
                        vendor = p_mfg.stdout.strip().capitalize()
                except Exception:
                    pass

            connection_mode = "wifi" if ":" in serial else "usb"
            dev_status = "online" if is_online else ("unauthorized" if status_str == "unauthorized" else "offline")

            devices.append(TargetDevice(
                id=f"and_{serial}",
                name=f"{vendor} {model}" if vendor != "Android" else model,
                module="android",
                connection_mode=connection_mode,
                ip_or_serial=serial,
                os_version=os_ver,
                model_name=model,
                vendor=vendor,
                status=dev_status
            ))
    except Exception as e:
        print(f"Error querying adb: {e}")

    # 2. If no ADB devices found, check Windows PnP to see if a phone is plugged in with USB Debugging OFF!
    if not devices:
        try:
            ps_cmd = (
                "Get-PnpDevice -PresentOnly | Where-Object { "
                "$_.Class -in @('WPD', 'AndroidUsbDeviceClass', 'USB') -and "
                "$_.FriendlyName -match 'Phone|Android|Galaxy|Pixel|Xiaomi|Huawei|Oppo|Vivo|Redmi|Realme|OnePlus|Motorola|MTP Device' "
                "} | Select-Object -First 3 FriendlyName, InstanceId | ConvertTo-Json"
            )
            res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True, text=True, timeout=5)
            if res.stdout.strip():
                try:
                    data = json.loads(res.stdout)
                    items = data if isinstance(data, list) else [data]
                    for idx, item in enumerate(items):
                        name = item.get("FriendlyName", "Connected USB Mobile Device")
                        inst = item.get("InstanceId", f"USB-{idx}")
                        devices.append(TargetDevice(
                            id=f"and_pnp_{idx}",
                            name=name,
                            module="android",
                            connection_mode="usb",
                            ip_or_serial="USB Cable Connected (Debugging Disabled)",
                            os_version="Enable USB Debugging in Developer Options",
                            model_name=name,
                            vendor="USB Mobile",
                            status="unauthorized"
                        ))
                except Exception:
                    pass
        except Exception as e:
            print(f"Error querying PnP: {e}")

    return devices

def connect_adb_wifi(ip_port: str) -> Dict[str, Any]:
    """Connects to an Android device over WiFi via ADB."""
    adb_bin = get_adb_command()
    try:
        res = subprocess.run([adb_bin, "connect", ip_port], capture_output=True, text=True, timeout=8)
        output = res.stdout.strip()
        success = "connected to" in output.lower() and "unable" not in output.lower()
        return {"success": success, "message": output}
    except Exception as e:
        return {"success": False, "message": str(e)}

def detect_wireless_networks() -> List[TargetDevice]:
    """Queries real Windows netsh and network interfaces for the actual connected WiFi network and gateway."""
    networks: List[TargetDevice] = []

    # 1. Parse real WiFi connection via netsh
    wifi_info: Dict[str, Any] = {}
    try:
        p = subprocess.run(['netsh', 'wlan', 'show', 'interfaces'], capture_output=True, text=True, timeout=5)
        out = p.stdout
        ssid_m = re.search(r'^\s*SSID\s*:\s*(.+)$', out, re.M)
        bssid_m = re.search(r'^\s*BSSID\s*:\s*(.+)$', out, re.M)
        auth_m = re.search(r'^\s*Authentication\s*:\s*(.+)$', out, re.M)
        cipher_m = re.search(r'^\s*Cipher\s*:\s*(.+)$', out, re.M)
        radio_m = re.search(r'^\s*Radio type\s*:\s*(.+)$', out, re.M)
        signal_m = re.search(r'^\s*Signal\s*:\s*(.+)$', out, re.M)
        desc_m = re.search(r'^\s*Description\s*:\s*(.+)$', out, re.M)
        state_m = re.search(r'^\s*State\s*:\s*(.+)$', out, re.M)

        if ssid_m and state_m and state_m.group(1).strip() == "connected":
            wifi_info = {
                "ssid": ssid_m.group(1).strip(),
                "bssid": bssid_m.group(1).strip() if bssid_m else "N/A",
                "auth": auth_m.group(1).strip() if auth_m else "Unknown",
                "cipher": cipher_m.group(1).strip() if cipher_m else "Unknown",
                "radio": radio_m.group(1).strip() if radio_m else "802.11",
                "signal": signal_m.group(1).strip() if signal_m else "100%",
                "adapter": desc_m.group(1).strip() if desc_m else "Wireless Adapter"
            }
    except Exception as e:
        print(f"Error running netsh: {e}")

    # 2. Get Real Gateway and Local IP via PowerShell
    gateway = "192.168.1.1"
    local_ip = "127.0.0.1"
    try:
        p_route = subprocess.run([
            'powershell', '-NoProfile', '-Command',
            "Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Select-Object -First 1 NextHop, InterfaceAlias | ConvertTo-Json"
        ], capture_output=True, text=True, timeout=5)
        if p_route.stdout.strip():
            route = json.loads(p_route.stdout)
            gateway = route.get("NextHop", "192.168.1.1")
            iface = route.get("InterfaceAlias", "Wi-Fi")

            p_ip = subprocess.run([
                'powershell', '-NoProfile', '-Command',
                f"(Get-NetIPAddress -InterfaceAlias '{iface}' -AddressFamily IPv4).IPAddress"
            ], capture_output=True, text=True, timeout=5)
            if p_ip.stdout.strip():
                local_ip = p_ip.stdout.strip().splitlines()[0].strip()
    except Exception as e:
        print(f"Error querying route: {e}")

    # Build real primary WiFi network device
    if wifi_info and wifi_info.get("ssid"):
        ssid = wifi_info["ssid"]
        auth = wifi_info["auth"]
        cipher = wifi_info["cipher"]
        radio = wifi_info["radio"]
        signal = wifi_info["signal"]

        # Derive /24 subnet from gateway
        gw_parts = gateway.split(".")
        subnet = f"{gw_parts[0]}.{gw_parts[1]}.{gw_parts[2]}.0/24" if len(gw_parts) == 4 else f"{gateway}/24"

        networks.append(TargetDevice(
            id="wifi_real_primary",
            name=f"Real WiFi: {ssid} ({signal} Signal)",
            module="wireless",
            connection_mode="network",
            ip_or_serial=f"{subnet} (Gateway: {gateway} | Host: {local_ip})",
            os_version=f"{radio} | {auth} ({cipher})",
            model_name=wifi_info.get("adapter", "Intel Wireless"),
            vendor="Active WLAN AP",
            status="online"
        ))

    # Also add the local Subnet Gateway target directly
    networks.append(TargetDevice(
        id="wifi_gateway_target",
        name=f"Subnet Gateway Router ({gateway})",
        module="wireless",
        connection_mode="network",
        ip_or_serial=gateway,
        os_version="Router / Access Point Firmware",
        model_name="Default Gateway",
        vendor="Local Gateway",
        status="online"
    ))

    return networks

def detect_ios_devices() -> List[TargetDevice]:
    """Queries Windows PnP devices for real Apple iPhone/iPad hardware."""
    devices: List[TargetDevice] = []

    try:
        ps_cmd = (
            "Get-PnpDevice -PresentOnly | Where-Object { "
            "$_.Class -in @('WPD', 'USB', 'MobileDevice') -and "
            "$_.FriendlyName -match 'Apple|iPhone|iPad|iPod' "
            "} | Select-Object FriendlyName, InstanceId | ConvertTo-Json"
        )
        res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True, text=True, timeout=5)
        if res.stdout.strip():
            try:
                data = json.loads(res.stdout)
                items = data if isinstance(data, list) else [data]
                for idx, item in enumerate(items):
                    name = item.get("FriendlyName", "Apple iOS Device")
                    inst = item.get("InstanceId", f"APPLE-USB-{idx}")
                    devices.append(TargetDevice(
                        id=f"ios_real_{idx}",
                        name=name,
                        module="ios",
                        connection_mode="usb",
                        ip_or_serial=inst,
                        os_version="Apple iOS Device Attached",
                        model_name=name,
                        vendor="Apple Inc.",
                        status="online"
                    ))
            except Exception:
                pass
    except Exception as e:
        print(f"Error querying Apple devices: {e}")

    return devices
