# Oracle Cloud Deployment Guide

This guide walks you through deploying the Video Overlay API to Oracle Cloud Infrastructure (OCI).

## Prerequisites

- Oracle Cloud account with available credits
- SSH key pair for server access
- Domain name (optional, for custom domain)

## Step 1: Create Oracle Cloud Compute Instance

1. **Log in to Oracle Cloud Console**
   - Go to https://cloud.oracle.com/
   - Sign in to your account

2. **Create a Compute Instance**
   - Navigate to "Compute" → "Instances"
   - Click "Create Instance"
   - Choose configuration:
     - **Name**: video-overlay-api
     - **Image**: Ubuntu 22.04 LTS
     - **Shape**: VM.Standard.E2.1.Micro (Free tier) or VM.Standard2.1 (Paid)
     - **Boot Volume**: 50GB minimum
     - **Network**: Use default VCN or create new one
     - **SSH Keys**: Upload your public key

3. **Configure Security Rules**
   - Go to "Networking" → "Virtual Cloud Networks"
   - Select your VCN → Security Lists → Default Security List
   - Add Ingress Rules:
     - **Port 22**: SSH access
     - **Port 80**: HTTP traffic
     - **Port 443**: HTTPS traffic
     - **Port 3000**: API access (temporary)

## Step 2: Connect to Your Instance

```bash
ssh -i /path/to/your/private-key ubuntu@YOUR_INSTANCE_IP
```

## Step 3: Server Setup

### Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### Install Node.js
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Install FFmpeg
```bash
sudo apt install -y ffmpeg
ffmpeg -version
```

### Install PM2 (Process Manager)
```bash
sudo npm install -y pm2 -g
```

### Install Nginx (Reverse Proxy)
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

## Step 4: Deploy Application

### Clone/Upload Your Code
```bash
# Create application directory
sudo mkdir -p /opt/video-overlay-api
sudo chown $USER:$USER /opt/video-overlay-api

# Upload your code (choose one method):

# Method 1: Using git (if you have a repository)
git clone YOUR_REPOSITORY_URL /opt/video-overlay-api

# Method 2: Using scp from local machine
# scp -i /path/to/private-key -r ./Video_overlay_api/* ubuntu@YOUR_IP:/opt/video-overlay-api/

cd /opt/video-overlay-api
```

### Install Dependencies
```bash
npm install --production
```

### Create Production Environment File
```bash
cat > .env << EOF
NODE_ENV=production
PORT=3000
TEMP_DIR=/opt/video-overlay-api/temp
OUTPUT_DIR=/opt/video-overlay-api/output
MAX_FILE_SIZE=200MB
FFMPEG_PATH=/usr/bin/ffmpeg
CORS_ORIGIN=*
EOF
```

### Create Required Directories
```bash
mkdir -p temp output
chmod 755 temp output
```

## Step 5: Configure PM2

### Create PM2 Configuration
```bash
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'video-overlay-api',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 4000
  }]
};
EOF
```

### Start Application with PM2
```bash
# Create logs directory
mkdir -p logs

# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command above
```

## Step 6: Configure Nginx Reverse Proxy

### Create Nginx Configuration
```bash
sudo tee /etc/nginx/sites-available/video-overlay-api << EOF
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    client_max_body_size 200M;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/video-overlay-api /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## Step 7: SSL Setup (Optional but Recommended)

### Install Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Get SSL Certificate
```bash
# Replace YOUR_DOMAIN with your actual domain
sudo certbot --nginx -d YOUR_DOMAIN

# Test automatic renewal
sudo certbot renew --dry-run
```

## Step 8: Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Check status
sudo ufw status
```

## Step 9: Monitoring and Maintenance

### Check Application Status
```bash
# PM2 status
pm2 status
pm2 logs video-overlay-api

# Nginx status
sudo systemctl status nginx

# Check disk space
df -h

# Check memory usage
free -h
```

### Setup Log Rotation
```bash
sudo tee /etc/logrotate.d/video-overlay-api << EOF
/opt/video-overlay-api/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

### Cleanup Script
```bash
cat > cleanup.sh << EOF
#!/bin/bash
# Clean up old processed videos (older than 24 hours)
find /opt/video-overlay-api/output -name "*.mp4" -mtime +1 -delete
find /opt/video-overlay-api/temp -name "*" -mtime +0 -delete
echo "Cleanup completed: \$(date)"
EOF

chmod +x cleanup.sh

# Add to crontab (run every 6 hours)
(crontab -l 2>/dev/null; echo "0 */6 * * * /opt/video-overlay-api/cleanup.sh >> /opt/video-overlay-api/logs/cleanup.log 2>&1") | crontab -
```

## Step 10: Testing Deployment

### Test API Endpoints
```bash
# Health check
curl http://YOUR_DOMAIN/health

# Test with actual video (replace with real Google Drive URL)
curl -X POST http://YOUR_DOMAIN/api/overlay \
  -H "Content-Type: application/json" \
  -d '{
    "videoUrl": "https://drive.google.com/file/d/YOUR_FILE_ID/view",
    "text": "Production Test",
    "fontSize": 32,
    "fontColor": "yellow"
  }'
```

## Troubleshooting

### Common Issues

1. **Permission Errors**
   ```bash
   sudo chown -R ubuntu:ubuntu /opt/video-overlay-api
   sudo chmod -R 755 /opt/video-overlay-api
   ```

2. **FFmpeg Not Found**
   ```bash
   which ffmpeg
   # Update .env file with correct path
   ```

3. **Out of Memory**
   ```bash
   # Add swap space
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

4. **Port Already in Use**
   ```bash
   sudo netstat -tulpn | grep :3000
   pm2 restart video-overlay-api
   ```

### Useful Commands

```bash
# Restart application
pm2 restart video-overlay-api

# Update application
cd /opt/video-overlay-api
git pull  # if using git
npm install --production
pm2 restart video-overlay-api

# Check logs
pm2 logs video-overlay-api
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Scaling Considerations

1. **Load Balancing**: Use Oracle Cloud Load Balancer for multiple instances
2. **Object Storage**: Use Oracle Object Storage for processed videos
3. **Database**: Add database for job tracking and user management
4. **CDN**: Use Oracle Cloud CDN for faster global delivery

## Security Best Practices

1. **Regular Updates**: Keep system and dependencies updated
2. **Firewall**: Only open necessary ports
3. **Monitoring**: Set up monitoring and alerts
4. **Backups**: Regular backups of important data
5. **Rate Limiting**: Implement rate limiting for API endpoints

Your Video Overlay API should now be running in production on Oracle Cloud! 🚀
