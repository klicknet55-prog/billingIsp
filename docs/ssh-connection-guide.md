# Panduan Koneksi SSH ke Server Production

## Masalah
Windows PowerShell tidak punya SSH client:
```powershell
PS C:\Users\WAK-PRI> ssh root@103.67.244.174
ssh : The term 'ssh' is not recognized...
```

## Solusi

### Opsi 1: Pakai PuTTY (PALING MUDAH) ⭐

1. **Download PuTTY**
   - Link: https://www.putty.org/
   - Download: `putty.exe` (64-bit)
   - Atau installer lengkap: `putty-64bit-installer.msi`

2. **Buka PuTTY**
   - Host Name: `103.67.244.174`
   - Port: `22`
   - Connection Type: `SSH`
   - Klik **Open**

3. **Login**
   - Login as: `root`
   - Password: (masukkan password root)

4. **Navigasi ke Project**
   ```bash
   cd /home/tunnelhost-netmanage/htdocs/netmanage.tunnelhost.my.id
   ```

---

### Opsi 2: Install OpenSSH via Windows Settings

1. **Buka Settings**
   - Press `Win + I`
   - Go to: **Apps** → **Optional Features**

2. **Add Feature**
   - Klik **Add a feature**
   - Cari **OpenSSH Client**
   - Install

3. **Restart PowerShell**
   - Tutup dan buka ulang PowerShell/Terminal

4. **Test SSH**
   ```powershell
   ssh root@103.67.244.174
   ```

---

### Opsi 3: Pakai Git Bash (Jika Sudah Install Git)

Jika sudah install Git for Windows, Git Bash sudah include SSH:

1. **Buka Git Bash**
   - Right-click di desktop → **Git Bash Here**
   - Atau cari "Git Bash" di Start Menu

2. **SSH Connect**
   ```bash
   ssh root@103.67.244.174
   ```

---

### Opsi 4: Pakai WSL (Windows Subsystem for Linux)

Jika sudah aktifkan WSL:

1. **Buka WSL Terminal**
   ```powershell
   wsl
   ```

2. **SSH Connect**
   ```bash
   ssh root@103.67.244.174
   ```

---

### Opsi 5: Pakai VS Code Remote SSH

1. **Install Extension**
   - Di VS Code, install: **Remote - SSH** (ms-vscode-remote.remote-ssh)

2. **Connect**
   - Press `Ctrl+Shift+P`
   - Ketik: **Remote-SSH: Connect to Host**
   - Masukkan: `root@103.67.244.174`
   - Enter password

3. **Open Terminal di VS Code**
   - Terminal akan langsung terhubung ke server

---

## Setelah Berhasil Connect

### 1. Navigasi ke Project
```bash
cd /home/tunnelhost-netmanage/htdocs/netmanage.tunnelhost.my.id
```

### 2. Pull Latest Code

⚠️ **PENTING**: Jangan pull sebagai root! File akan jadi milik root dan bikin masalah.

```bash
# ✅ CARA BENAR: Switch ke user dulu
su - tunnelhost-netmanage
cd ~/htdocs/netmanage.tunnelhost.my.id
git pull origin netmanage-implementation

# Atau pakai sudo -u (jika masih sebagai root)
# sudo -u tunnelhost-netmanage git pull origin netmanage-implementation
```

### 3. Check Sudo Access
```bash
# Test sebagai root (bisa)
systemctl status redis-server

# Switch ke user tunnelhost-netmanage
su - tunnelhost-netmanage
cd ~/htdocs/netmanage.tunnelhost.my.id

# Test sudo (kemungkinan gagal)
sudo systemctl status redis-server
```

### 4. Grant Sudo untuk tunnelhost-netmanage (Jika Login sebagai Root)

```bash
# Kembali ke root
exit  # Exit dari tunnelhost-netmanage

# Edit sudoers
visudo

# Tambahkan di akhir file (sudoers tidak support wildcards, harus list semua service):
tunnelhost-netmanage ALL=(ALL) NOPASSWD: /bin/systemctl start billisp, /bin/systemctl stop billisp, /bin/systemctl restart billisp, /bin/systemctl status billisp, /bin/systemctl enable billisp, /bin/systemctl disable billisp, /bin/systemctl start billisp-worker, /bin/systemctl stop billisp-worker, /bin/systemctl restart billisp-worker, /bin/systemctl status billisp-worker, /bin/systemctl enable billisp-worker, /bin/systemctl disable billisp-worker, /bin/systemctl start billisp-cron.timer, /bin/systemctl stop billisp-cron.timer, /bin/systemctl restart billisp-cron.timer, /bin/systemctl status billisp-cron.timer, /bin/systemctl enable billisp-cron.timer, /bin/systemctl disable billisp-cron.timer, /bin/systemctl start billisp-backup.timer, /bin/systemctl stop billisp-backup.timer, /bin/systemctl restart billisp-backup.timer, /bin/systemctl status billisp-backup.timer, /bin/systemctl enable billisp-backup.timer, /bin/systemctl disable billisp-backup.timer, /bin/systemctl daemon-reload

# Save: Ctrl+X → Y → Enter (atau :wq jika pakai vi)
```

### 5. Test Sudo dari tunnelhost-netmanage

```bash
# Switch ke user
su - tunnelhost-netmanage

# Test sudo (harus berhasil tanpa password)
sudo systemctl status billisp
sudo systemctl daemon-reload
```

### 6. Jalankan Setup Script

```bash
# Pastikan di directory project
cd ~/htdocs/netmanage.tunnelhost.my.id

# ✅ CARA BENAR: Jalankan sebagai root, tapi pastikan ownership benar sebelumnya
# Jika login sebagai root:
sudo bash scripts/setup-systemd.sh

# Atau jika sudah grant sudo ke tunnelhost-netmanage:
# Switch ke user tunnelhost-netmanage dulu
su - tunnelhost-netmanage
cd ~/htdocs/netmanage.tunnelhost.my.id
sudo bash scripts/setup-systemd.sh
```

### 7. Fix Ownership (Jika Ada Masalah)

```bash
# Jika accidentally pull/edit sebagai root, fix ownership:
sudo chown -R tunnelhost-netmanage:tunnelhost-netmanage /home/tunnelhost-netmanage/htdocs/netmanage.tunnelhost.my.id

# Verifikasi ownership
ls -la /home/tunnelhost-netmanage/htdocs/netmanage.tunnelhost.my.id
# Harus: tunnelhost-netmanage tunnelhost-netmanage
```

---

## Troubleshooting

### File Ownership Issues (Permission Denied)

```bash
# Gejala: npm install gagal, systemd service gagal start, deploy error
# Penyebab: File milik root karena git pull/edit sebagai root

# Solusi: Fix ownership
sudo chown -R tunnelhost-netmanage:tunnelhost-netmanage /home/tunnelhost-netmanage/htdocs/netmanage.tunnelhost.my.id

# Cek ownership setelah fix
ls -la /home/tunnelhost-netmanage/htdocs/netmanage.tunnelhost.my.id
# Semua file harus: tunnelhost-netmanage tunnelhost-netmanage

# Prevent di masa depan: Selalu pull/edit sebagai user, bukan root
su - tunnelhost-netmanage
```

### SSH Connection Refused
```bash
# Pastikan SSH service jalan
sudo systemctl status sshd

# Check firewall
sudo ufw status
sudo ufw allow 22/tcp
```

### Permission Denied (publickey)
```bash
# Server hanya accept SSH key, bukan password
# Minta admin untuk enable password authentication
# Atau setup SSH key di Windows
```

### Timeout
```bash
# Check IP server benar: 103.67.244.174
# Check koneksi internet
ping 103.67.244.174
```

---

## Rekomendasi

**PALING MUDAH**: Pakai **PuTTY** (Opsi 1) - Download, install, connect.

**PALING BAGUS**: Pakai **VS Code Remote SSH** (Opsi 5) - Edit code langsung di server, integrated terminal.

**UNTUK SCRIPT**: Install **OpenSSH Client** via Windows Settings (Opsi 2) - Agar bisa SSH dari PowerShell/CMD.
