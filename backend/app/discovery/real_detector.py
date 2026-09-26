import subprocess
import re
import os
import json
import socket
import concurrent.futures
import io
import base64
import qrcode
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from app.models.scan import TargetDevice, ScanModule

REGISTERED_MOBILES: Dict[str, Dict[str, Any]] = {}
AUTHORIZED_TARGETS: Dict[str, Dict[str, Any]] = {}

def authorize_device(data: Dict[str, Any]) -> TargetDevice:
    """Explicitly authorizes a discovered device for security auditing."""
    ip = str(data.get("ip_or_serial") or data.get("client_ip") or "").strip()
    dev_id = str(data.get("id") or f"auth_{ip.replace('.', '_')}").strip()
    name = str(data.get("name") or data.get("model") or f"Authorized Device ({ip})").strip()
    module = str(data.get("module") or "android").strip()
    vendor = str(data.get("vendor") or "Authorized Target").strip()
    model_name = str(data.get("model_name") or data.get("model") or name).strip()
    conn_mode = str(data.get("connection_mode") or "network").strip()
    os_ver = str(data.get("os_version") or "Authorized Audit Target").strip()

    target_obj = TargetDevice(
        id=dev_id,
        name=name,
        module=module,
        connection_mode=conn_mode,
        ip_or_serial=ip,
        os_version=os_ver,
        model_name=model_name,
        vendor=vendor,
        status="online"
    )

    auth_record = target_obj.model_dump()
    auth_record["authorized_at"] = datetime.now().isoformat()
    
    if ip:
        AUTHORIZED_TARGETS[ip] = auth_record
    AUTHORIZED_TARGETS[dev_id] = auth_record

    return target_obj

def unauthorize_device(device_id_or_ip: str) -> bool:
    """Removes a device from the authorized targets registry."""
    cleaned = device_id_or_ip.strip()
    removed = False
    if cleaned in AUTHORIZED_TARGETS:
        del AUTHORIZED_TARGETS[cleaned]
        removed = True
    for k, v in list(AUTHORIZED_TARGETS.items()):
        if v.get("id") == cleaned or v.get("ip_or_serial") == cleaned:
            del AUTHORIZED_TARGETS[k]
            removed = True
    return removed

def get_authorized_devices() -> List[TargetDevice]:
    """Returns all currently authorized audit targets with verified liveness status."""
    devices: List[TargetDevice] = []
    seen = set()
    for k, v in list(AUTHORIZED_TARGETS.items()):
        dev_id = v.get("id")
        if not dev_id or dev_id in seen:
            continue
        seen.add(dev_id)
        
        ip = v.get("ip_or_serial", "")
        is_live = True
        if ip and not ip.startswith("USB"):
            is_live, _ = check_ip_liveness(ip, timeout_ms=350)
        
        dev_dict = dict(v)
        dev_dict["status"] = "online" if is_live else "offline"
        filtered_dict = {k2: v2 for k2, v2 in dev_dict.items() if k2 in TargetDevice.model_fields}
        devices.append(TargetDevice(**filtered_dict))
    return devices

# Path to self-contained adb.exe
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ADB_PATH = BACKEND_DIR / "tools" / "platform-tools" / "adb.exe"

def get_adb_command() -> str:
    if ADB_PATH.exists():
        return str(ADB_PATH)
    return "adb"

def get_local_ip() -> str:
    """Discovers outbound LAN IPv4 address for local network pairing."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('192.168.100.1', 80))
        return s.getsockname()[0]
    except Exception:
        try:
            s.connect(('8.8.8.8', 80))
            return s.getsockname()[0]
        except Exception:
            return "127.0.0.1"
    finally:
        s.close()

def generate_mobile_pairing_qr(port: int = 8765) -> Dict[str, Any]:
    """Generates a high-contrast cyber QR Code pointing to the mobile onboarding portal."""
    local_ip = get_local_ip()
    pairing_url = f"http://{local_ip}:{port}/mobile-audit"

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=2,
    )
    qr.add_data(pairing_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#00e5ff", back_color="#0b1120")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    data_url = f"data:image/png;base64,{base64.b64encode(buf.getvalue()).decode('utf-8')}"

    return {
        "qr_image": data_url,
        "pairing_url": pairing_url,
        "local_ip": local_ip
    }

def read_arp_hosts() -> List[tuple]:
    """Reads dynamic IPv4 host entries from Windows ARP cache."""
    try:
        p_arp = subprocess.run(["arp", "-a"], capture_output=True, text=True, timeout=2)
        lines = p_arp.stdout.splitlines()
        hosts = []
        for line in lines:
            parts = line.strip().split()
            if len(parts) >= 3 and parts[2].lower() == "dynamic":
                ip, mac = parts[0], parts[1]
                if not ip.startswith("224.") and not ip.startswith("239.") and not ip.endswith(".255"):
                    hosts.append((ip, mac))
        return hosts
    except Exception:
        return []

def check_ip_liveness(ip: str, timeout_ms: int = 500) -> tuple[bool, str]:
    """Actively verifies if target device is online via ICMP ping and direct TCP probes."""
    clean_ip = ip.strip()
    if ":" in clean_ip:
        clean_ip = clean_ip.split(":")[0]

    # Fast ICMP Ping probe (1 fast ping, retry once if lost)
    for attempt in range(2):
        try:
            p = subprocess.run(['ping', '-n', '1', '-w', str(timeout_ms), clean_ip], capture_output=True, text=True, timeout=1.5)
            out = p.stdout.lower()
            if ('reply from ' + clean_ip.lower() in out or 'bytes=' in out or 'ttl=' in out) and 'unreachable' not in out and 'timed out' not in out:
                return True, 'ICMP Ping confirmed'
        except Exception:
            pass

    # Fast TCP Socket Probes on standard mobile / network service ports
    probe_ports = [5555, 80, 443, 8080, 8000, 2121, 8022, 2323, 4444]
    for port in probe_ports:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.25)
        try:
            if s.connect_ex((clean_ip, port)) == 0:
                s.close()
                return True, f'TCP port {port} active'
        except Exception:
            pass
        finally:
            s.close()

    return False, f'Target {clean_ip} is unreachable (No ICMP reply, all TCP probes failed)'

def delete_device(device_id_or_ip: str) -> bool:
    """Deletes/dismisses a device from registered mobiles, authorized targets, host cache, or custom lists."""
    cleaned = device_id_or_ip.strip()
    removed = False

    if cleaned in REGISTERED_MOBILES:
        del REGISTERED_MOBILES[cleaned]
        removed = True

    if cleaned in AUTHORIZED_TARGETS:
        del AUTHORIZED_TARGETS[cleaned]
        removed = True

    if cleaned in _HOST_CACHE:
        del _HOST_CACHE[cleaned]
        removed = True

    ip_from_id = cleaned.replace("and_qr_", "").replace("and_wifi_", "").replace("wifi_host_", "").replace("auth_", "").replace("_", ".")
    if ip_from_id in REGISTERED_MOBILES:
        del REGISTERED_MOBILES[ip_from_id]
        removed = True
    if ip_from_id in AUTHORIZED_TARGETS:
        del AUTHORIZED_TARGETS[ip_from_id]
        removed = True
    if ip_from_id in _HOST_CACHE:
        del _HOST_CACHE[ip_from_id]
        removed = True

    for ip, data in list(REGISTERED_MOBILES.items()):
        if data.get("client_ip") == cleaned or ip == cleaned:
            del REGISTERED_MOBILES[ip]
            removed = True

    for k, data in list(AUTHORIZED_TARGETS.items()):
        if data.get("ip_or_serial") == cleaned or data.get("id") == cleaned or k == cleaned:
            del AUTHORIZED_TARGETS[k]
            removed = True

    return removed

def clear_offline_devices() -> int:
    """Removes all currently offline devices from registered mobiles, authorized targets, and host cache."""
    cleared = 0
    for ip in list(REGISTERED_MOBILES.keys()):
        is_alive, _ = check_ip_liveness(ip, timeout_ms=350)
        if not is_alive:
            del REGISTERED_MOBILES[ip]
            cleared += 1

    for k, data in list(AUTHORIZED_TARGETS.items()):
        ip = data.get("ip_or_serial", "")
        if ip and not ip.startswith("USB"):
            is_alive, _ = check_ip_liveness(ip, timeout_ms=350)
            if not is_alive:
                del AUTHORIZED_TARGETS[k]
                cleared += 1

    for ip in list(_HOST_CACHE.keys()):
        is_alive, _ = check_ip_liveness(ip, timeout_ms=350)
        if not is_alive:
            del _HOST_CACHE[ip]
            cleared += 1

    return cleared

def detect_android_devices() -> List[TargetDevice]:
    """Queries registered wireless QR mobiles, ADB daemon, and Windows PnP to detect connected Android devices."""
    devices: List[TargetDevice] = []
    seen_ips = set()

    # 0. Authorized Audit Targets
    for auth_dev in get_authorized_devices():
        if auth_dev.module in ["android", "all"] or any(k in (auth_dev.name + ' ' + (auth_dev.model_name or '')).lower() for k in ["s10", "galaxy", "samsung", "a0", "a1", "a2", "a5", "sm-", "pixel", "redmi", "xiaomi", "killer", "phone", "mobile", "android"]):
            seen_ips.add(auth_dev.ip_or_serial)
            devices.append(auth_dev)

    # 1. Registered Mobile Devices via Wireless QR Onboarding (Highest Fidelity)
    for ip, data in list(REGISTERED_MOBILES.items()):
        seen_ips.add(ip)
        vendor = data.get("vendor", "Android")
        model = data.get("model", "Mobile")
        dev_name = model if model.lower().startswith(vendor.lower()) else f"{vendor} {model}"
        os_ver = data.get("os_version", "Android")
        hw = data.get("hardware", "Mobile Hardware")
        screen = data.get("screen", "")
        
        # Real-time liveness check: is this registered phone reachable right now?
        is_online, _ = check_ip_liveness(ip, timeout_ms=450)
        status_val = "online" if is_online else "offline"

        devices.append(TargetDevice(
            id=f"and_qr_{ip.replace('.', '_')}",
            name=f"{dev_name} (QR Linked)",
            module="android",
            connection_mode="wireless_qr",
            ip_or_serial=ip,
            os_version=f"{os_ver} • {hw}" if hw else os_ver,
            model_name=model,
            vendor=vendor,
            status=status_val
        ))

    # 2. Run adb devices -l
    adb_bin = get_adb_command()
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

    # 3. Add discovered mobile phones on Wi-Fi subnet (if not already added via QR)
    active_ips = {ip for ip, _ in read_arp_hosts()}
    for ip, host_name in list(_HOST_CACHE.items()):
        if ip in seen_ips:
            continue
        if active_ips and ip not in active_ips:
            continue
        h_lower = host_name.lower()
        if any(k in h_lower for k in ["s10", "galaxy", "samsung", "a0", "a1", "a2", "a5", "sm-", "pixel", "redmi", "xiaomi", "killer"]):
            seen_ips.add(ip)
            is_online, _ = check_ip_liveness(ip, timeout_ms=450)
            devices.append(TargetDevice(
                id=f"and_wifi_{ip.replace('.', '_')}",
                name=f"{host_name} (Wi-Fi Detected)",
                module="android",
                connection_mode="network",
                ip_or_serial=ip,
                os_version="Android Smartphone on Local Subnet",
                model_name=host_name,
                vendor="Samsung Mobile" if "s10" in h_lower or "galaxy" in h_lower else "Android Mobile",
                status="online" if is_online else "offline"
            ))

    # 4. If no devices found, check Windows PnP to see if a phone is plugged in with USB Debugging OFF!
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

def pair_adb_wifi(ip_port: str, pairing_code: str) -> Dict[str, Any]:
    """Pairs with an Android device over WiFi via ADB using a 6-digit pairing code (Android 11+)."""
    adb_bin = get_adb_command()
    try:
        res = subprocess.run([adb_bin, "pair", ip_port.strip(), pairing_code.strip()], capture_output=True, text=True, timeout=10)
        output = (res.stdout + "\n" + res.stderr).strip()
        success = "successfully paired" in output.lower()
        return {"success": success, "message": output}
    except Exception as e:
        return {"success": False, "message": str(e)}

def connect_adb_wifi(ip_port: str) -> Dict[str, Any]:
    """Connects to an Android device over WiFi via ADB."""
    adb_bin = get_adb_command()
    try:
        res = subprocess.run([adb_bin, "connect", ip_port.strip()], capture_output=True, text=True, timeout=8)
        output = (res.stdout + "\n" + res.stderr).strip()
        success = "connected to" in output.lower() and "unable" not in output.lower()
        return {"success": success, "message": output}
    except Exception as e:
        return {"success": False, "message": str(e)}

_HOST_CACHE: Dict[str, str] = {
    "192.168.100.54": "Khani-s-S10",
    "192.168.100.95": "HAPPY-KILLER-s-A07",
    "192.168.100.1": "Gateway Router",
    "192.168.100.206": "Auditor Console (Local PC)"
}

def _background_resolve(ip: str):
    try:
        name = socket.gethostbyaddr(ip)[0]
        if name:
            _HOST_CACHE[ip] = name
    except Exception:
        pass

def _resolve_host(ip: str) -> str:
    if ip in _HOST_CACHE:
        return _HOST_CACHE[ip]
    import threading
    threading.Thread(target=_background_resolve, args=(ip,), daemon=True).start()
    return ""

def sweep_subnet_devices(gateway: str, local_ip: str) -> List[TargetDevice]:
    """Scans the local /24 Wi-Fi subnet using fast ping + ARP cache table to discover all live connected devices."""
    devices: List[TargetDevice] = []
    gw_parts = gateway.split(".")
    if len(gw_parts) != 4:
        return devices

    base = f"{gw_parts[0]}.{gw_parts[1]}.{gw_parts[2]}."

    # Query Windows ARP table matching the local subnet prefix
    def _read_arp_hosts() -> List[tuple]:
        try:
            p_arp = subprocess.run(["arp", "-a"], capture_output=True, text=True, timeout=2)
            lines = p_arp.stdout.splitlines()
            hosts = []
            seen_ips = set()
            for line in lines:
                parts = line.strip().split()
                if len(parts) >= 3 and parts[2].lower() == "dynamic":
                    ip, mac = parts[0], parts[1]
                    if ip.startswith(base) and not ip.startswith("224.") and not ip.startswith("239.") and not ip.endswith(".255"):
                        if ip not in seen_ips:
                            seen_ips.add(ip)
                            hosts.append((ip, mac))
            return hosts
        except Exception:
            return []

    def _async_ping_sweep():
        sweep_ips = [f"{base}{i}" for i in range(1, 255)]
        def ping_host(target_ip: str):
            try:
                subprocess.run(
                    ["ping", "-n", "1", "-w", "45", target_ip],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
            except Exception:
                pass
        with concurrent.futures.ThreadPoolExecutor(max_workers=60) as executor:
            list(executor.map(ping_host, sweep_ips))

    raw_hosts = _read_arp_hosts()

    # Trigger background ping sweep across full /24 subnet (1 to 254)
    import threading
    threading.Thread(target=_async_ping_sweep, daemon=True).start()

    # If first time or only 1 host found, do a fast synchronous sweep to seed ARP table
    if len(raw_hosts) <= 1:
        _async_ping_sweep()
        raw_hosts = _read_arp_hosts()

    # Ensure local machine is in list if it's on this subnet
    if local_ip and local_ip.startswith(base) and not any(h[0] == local_ip for h in raw_hosts):
        raw_hosts.append((local_ip, "LOCAL-IFACE"))

    try:
        # Resolve hostnames from non-blocking cache
        hostnames = [_resolve_host(ip) for ip, _ in raw_hosts]

        # Map each active connected host
        for (ip, mac), hostname in zip(raw_hosts, hostnames):
            is_gw = (ip == gateway)
            
            # Infer device classification & friendly vendor
            h_lower = hostname.lower()
            if is_gw:
                vendor = "Gateway Router"
                dev_type = "Wi-Fi Access Point / Router"
                name = f"Router Gateway ({ip})"
            elif any(k in h_lower for k in ["s10", "galaxy", "samsung", "a0", "a1", "a2", "a5", "sm-"]):
                vendor = "Samsung Mobile"
                dev_type = "Android Smartphone"
                name = hostname if hostname else f"Samsung Galaxy ({ip})"
            elif any(k in h_lower for k in ["iphone", "ipad", "apple", "mac"]):
                vendor = "Apple Inc."
                dev_type = "Apple iOS Device"
                name = hostname if hostname else f"Apple Device ({ip})"
            elif any(k in h_lower for k in ["pixel"]):
                vendor = "Google"
                dev_type = "Google Pixel (Android)"
                name = hostname if hostname else f"Pixel Device ({ip})"
            elif any(k in h_lower for k in ["xiaomi", "redmi", "poco"]):
                vendor = "Xiaomi"
                dev_type = "Xiaomi Android Device"
                name = hostname if hostname else f"Xiaomi Device ({ip})"
            elif any(k in h_lower for k in ["killer", "phone", "mobile", "android"]):
                vendor = "Connected Mobile"
                dev_type = "Android Smartphone"
                name = hostname if hostname else f"Android Phone ({ip})"
            elif ip == local_ip:
                vendor = "Auditor System"
                dev_type = "Auditor Console Workstation"
                name = f"Auditor Console Host ({ip})"
            else:
                vendor = "Connected Wi-Fi Host"
                dev_type = "Network Endpoint"
                name = hostname if hostname else f"Wi-Fi Host ({ip})"

            is_live, _ = check_ip_liveness(ip, timeout_ms=300)
            devices.append(TargetDevice(
                id=f"wifi_host_{ip.replace('.', '_')}",
                name=name,
                module="wireless",
                connection_mode="network",
                ip_or_serial=ip,
                os_version=f"MAC: {mac.upper()} | {dev_type}",
                model_name=hostname if hostname else f"Host {ip}",
                vendor=vendor,
                status="online" if is_live else "offline"
            ))
    except Exception as e:
        print(f"Error parsing ARP table: {e}")

    return devices

def detect_wireless_networks() -> List[TargetDevice]:
    """Queries real Windows netsh and network interfaces for the actual connected WiFi network, gateway, and all connected subnet devices."""
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

    # 2. Get Real Gateway and Local IP via native route print (sub-50ms)
    gateway = "192.168.100.1"
    local_ip = "192.168.100.114"
    try:
        p_route = subprocess.run(['route', 'print', '0.0.0.0'], capture_output=True, text=True, timeout=2)
        for line in p_route.stdout.splitlines():
            parts = line.split()
            if len(parts) >= 5 and parts[0] == '0.0.0.0' and parts[1] == '0.0.0.0':
                gateway = parts[2]
                local_ip = parts[3]
                break
    except Exception as e:
        print(f"Error querying route: {e}")

    # 3. Build real primary WiFi network device
    if wifi_info and wifi_info.get("ssid"):
        ssid = wifi_info["ssid"]
        auth = wifi_info["auth"]
        cipher = wifi_info["cipher"]
        radio = wifi_info["radio"]
        signal = wifi_info["signal"]

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

    # 4. Enumerate all connected devices on the local Wi-Fi subnet
    subnet_hosts = sweep_subnet_devices(gateway, local_ip)
    
    # If subnet sweep found hosts, add them!
    if subnet_hosts:
        networks.extend(subnet_hosts)
    else:
        # Fallback to gateway target if sweep had no dynamic entries
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
