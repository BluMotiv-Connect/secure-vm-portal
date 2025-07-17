# UptimeRobot Setup Guide

To prevent your backend from sleeping on Render's free tier, set up UptimeRobot monitoring:

## Step 1: Create UptimeRobot Account
1. Go to [https://uptimerobot.com](https://uptimerobot.com)
2. Sign up for a free account

## Step 2: Add New Monitor
1. Click "Add New Monitor"
2. Configure the monitor:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: Secure VM Portal Backend
   - **URL**: `https://secure-vm-portal-backend.onrender.com/api/health`
   - **Monitoring Interval**: 5 minutes (free tier)
   - **Monitor Timeout**: 30 seconds

## Step 3: Set Up Notifications (Optional)
1. Add your email for notifications
2. Configure alert settings:
   - Alert when down
   - Alert when back up
   - Send notifications every 5 minutes when down

## Alternative: Local Keep-Alive Script

If you prefer to run a local keep-alive service:

```bash
# Install dependencies (if not already installed)
npm install axios

# Run the keep-alive script
node scripts/keep-backend-alive.js
```

This script will ping your backend every 10 minutes to keep it awake.

## Expected Results

After setting up UptimeRobot:
- ✅ Backend stays awake 24/7
- ✅ No more CORS errors from sleeping backend
- ✅ Faster response times for users
- ✅ Email notifications if backend goes down

## Monitoring Dashboard

UptimeRobot provides:
- Uptime percentage
- Response time graphs
- Downtime alerts
- Public status pages (optional)