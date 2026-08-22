# Production Security & Deployment Hardening Guide — INMinut Application

This guide documents the procedures and configurations required for secure deployment of the INMinut application.

---

## 1. RESTRICTING DATABASE ACCESS FROM THE PUBLIC INTERNET

### Problem
Exposing MongoDB directly to `0.0.0.0:27017` allows attackers worldwide to attempt brute-force authentication, port scanning, or unauthorized access.

### Production Solution: Network Isolation & Private Binding

#### Step 1: Bind MongoDB Only to Local / Private Loopback
Edit MongoDB configuration `/etc/mongod.conf`:
```yaml
net:
  port: 27017
  bindIp: 127.0.0.1  # Do NOT use 0.0.0.0. Bind only to localhost or private VPC IP
```
Restart MongoDB:
```bash
sudo systemctl restart mongod
```

#### Step 2: Configure UFW / Cloud Firewall Rules
Block external incoming traffic to port `27017`:
```bash
# Ubuntu UFW Firewall
sudo ufw default deny incoming
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (for Certbot redirect)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 27017/tcp  # Block MongoDB public access
sudo ufw enable
```

#### Step 3: Enable MongoDB Authentication (RBAC)
Edit `/etc/mongod.conf`:
```yaml
security:
  authorization: enabled
```

Create a strong administrative and application database user in Mongo Shell:
```js
use admin
db.createUser({
  user: "inminut_app_user",
  pwd: "Use-Strong-Random-Password-Here-32+chars",
  roles: [{ role: "readWrite", db: "breakingapp" }]
})
```
Update `MONGO_URI` in `.env`:
```env
MONGO_URI=mongodb://inminut_app_user:Use-Strong-Random-Password-Here-32+chars@127.0.0.1:27017/breakingapp?authSource=admin
```

#### Step 4: MongoDB Atlas / Managed Cluster Encryption & IP Allowlist
If using MongoDB Atlas:
1. Go to **Network Access** → Delete `0.0.0.0/0` (Allow Access from Anywhere).
2. Add only your application server's static Elastic IP address (`/32`).
3. Ensure TLS/SSL is required in the connection string (`ssl=true`).

---

## 2. HTTPS ENFORCEMENT & TLS CONFIGURATION

### Problem
Transmitting API data, JWT tokens, or credentials over HTTP exposes them to Man-in-the-Middle (MitM) eavesdropping and packet sniffing.

### Nginx Reverse Proxy with Free SSL (Certbot / Let's Encrypt)
Deploy Nginx as a reverse proxy in front of Node.js app:

`/etc/nginx/sites-available/api.inminut.com`:
```nginx
server {
    listen 80;
    server_name api.inminut.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.inminut.com;

    ssl_certificate /etc/letsencrypt/live/api.inminut.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.inminut.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

---

## 3. SECURE SECRET MANAGEMENT

### Rules
1. **Never commit `.env` or sensitive PEM files to git repositories.**
2. Set `NODE_ENV=production` in production environments.
3. Generate a strong 256-bit random key for `JWT_SECRET`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
4. The application enforces `validateEnv()` on startup and will reject insecure default secrets (e.g., `"your-secret-key"`) or short secrets in production.

---

## 4. LOGGING, MONITORING & SUSPICIOUS BEHAVIOR DETECTION

Structured logs are written to the `logs/` directory:

| Log File | Purpose | Captured Events |
|---|---|---|
| `logs/auth.log` | Authentication Audit Trail | Login success, failed logins (incorrect password/user), registration, password resets, email verification, token invalidations. |
| `logs/error.log` | API & Runtime Errors | HTTP 4xx/5xx status codes, unhandled exceptions, database connectivity errors, stack traces (masked in response). |
| `logs/security.log` | Suspicious Traffic Patterns | Rate limit breaches, NoSQL injection attempts, unencrypted HTTP attempts, CORS origin blocks, unauthorized role access. |
| `logs/combined.log` | Aggregated Log Stream | Complete chronological event stream. |

### Log Monitoring with Fail2ban (Optional Production Hardening)
Configure `fail2ban` to monitor `logs/security.log` or `logs/auth.log` and automatically ban IPs exhibiting persistent brute-force or rate-limit violations:

`/etc/fail2ban/jail.d/inminut-auth.conf`:
```ini
[inminut-auth]
enabled = true
port = http,https
filter = inminut-auth
logpath = /home/ubuntu/INMinut-Backend/logs/auth.log
maxretry = 5
findtime = 600
bantime = 3600
```
