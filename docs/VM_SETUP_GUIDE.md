# VM Setup & Usage Guide

## 🔧 Admin: How to Add VMs

### Step 1: Access Admin Panel

1. **Login as Admin** to the portal
2. **Navigate to Admin Dashboard** → **Virtual Machines**
3. **Click "Add VM"** button

### Step 2: Fill VM Basic Information

#### **Required Fields:**

| Field | Description | Example |
|-------|-------------|---------|
| **VM Name** | Unique identifier for the VM | `DEV-WEB-01`, `PROD-DB-SERVER` |
| **IP Address** | VM's network IP address | `192.168.1.100`, `10.0.0.50` |
| **Operating System** | Select from dropdown | `Windows`, `Linux`, `macOS` |
| **Status** | Current VM state | `Online`, `Offline`, `Maintenance` |

#### **Optional Fields:**

| Field | Description | Example |
|-------|-------------|---------|
| **Description** | Purpose/details about the VM | `Development web server for testing` |
| **OS Version** | Specific OS version | `Windows Server 2019`, `Ubuntu 20.04` |
| **Region** | Cloud region or location | `us-east-1`, `westeurope` |
| **Instance ID** | Cloud provider instance ID | `i-1234567890abcdef0` |

#### **Metadata (JSON Tags):**
```json
{
  "environment": "development",
  "team": "frontend",
  "cost-center": "engineering",
  "project": "webapp-v2"
}
```

### Step 3: Set Up VM Credentials (Critical for Automation)

After creating the VM, you **MUST** set up credentials for automated connections:

#### **For Windows VMs (RDP):**

1. **Click the VM** → **"Manage Credentials"**
2. **Fill the following:**
   - **Username**: Windows admin user (e.g., `Administrator`, `vmadmin`)
   - **Password**: User's login password
   - **Connection Type**: `RDP`
   - **Connection Port**: `3389` (default RDP port)

#### **For Linux VMs (SSH):**

**Option A: Password Authentication**
- **Username**: SSH user (e.g., `ubuntu`, `root`, `vmuser`)
- **Password**: User's login password
- **Connection Type**: `SSH`
- **Connection Port**: `22` (default SSH port)

**Option B: Key-based Authentication (Recommended)**
- **Username**: SSH user
- **Private Key**: Full SSH private key content
- **Connection Type**: `SSH`
- **Connection Port**: `22`

#### **Private Key Format Example:**
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABFwAAAAdzc2gtcn
NhAAAAAwEAAQAAAQEAuVdneuQ8R1NhgZlXnJn6qGhR4r1dEK6pPaNcAaS9lF7q...
[full private key content]
...
-----END OPENSSH PRIVATE KEY-----
```

### Step 4: Assign VM to Employee

1. **Click VM** → **"Assign User"**
2. **Select Employee** from dropdown
3. **Click "Assign VM"**

**✅ VM is now ready for automated connections!**

---

## 👨‍💻 Employee: How to Use VMs

### Step 1: Access Your VMs

1. **Login to Employee Portal**
2. **Navigate to "My VMs"** tab
3. **View your assigned VMs**

### Step 2: Connect to VM (One-Click!)

1. **Find your VM** in the list
2. **Click "Work with VM"** button
3. **Click "Connect Now"** in the modal

**🚀 That's it! The VM will open automatically!**

### What Happens During Connection:

#### **For Windows VMs:**
- RDP client (mstsc) launches automatically
- Credentials are injected securely
- Full-screen connection opens
- Session tracking begins

#### **For Linux VMs:**
- Terminal/SSH client opens automatically  
- SSH connection established with pre-configured auth
- Session tracking begins

### Step 3: Monitor Your Session

While connected, you'll see:
- **Real-time session status** in the portal
- **Connection duration** timer
- **"Force End Session"** option if needed

### Step 4: End Your Session

**Automatic:** Just close the RDP/SSH window - session ends automatically!

**Manual:** Click **"Force End Session"** in the portal

---

## 📊 Session Tracking & Monitoring

### For Employees:

- **Active Connections**: See real-time status of your VM sessions
- **Session History**: View past connections and work hours
- **Productivity Dashboard**: Track your daily/weekly VM usage

### For Admins:

- **Live Monitoring**: See all active VM sessions across organization
- **Usage Reports**: Generate detailed VM utilization reports
- **User Analytics**: Track individual employee VM usage patterns

---

## 🔐 Security Features

### Credential Protection:
- **Encrypted Storage**: All VM passwords/keys encrypted in database
- **Zero Exposure**: Employees never see VM credentials
- **Automatic Cleanup**: Credentials removed from memory after session
- **Audit Trail**: Complete logging of all credential access

### Session Security:
- **Process Monitoring**: Connection processes tracked and monitored
- **Automatic Timeouts**: Sessions end after 8 hours by default
- **Forced Disconnection**: Admins can terminate sessions remotely

---

## 🛠 Platform Requirements

### For Employees:

#### **Windows:**
- **Built-in RDP client** (mstsc) - Already installed
- **OpenSSH client** - Install from Windows Optional Features for SSH

#### **macOS:**
- **Built-in RDP support** - Already available
- **Built-in SSH client** - Already available
- **Optional**: Install `sshpass` for password SSH: `brew install sshpass`

#### **Linux:**
- **RDP client**: Install `rdesktop` or `freerdp`
- **SSH client**: Usually pre-installed (`openssh-client`)
- **Password SSH**: Install `sshpass` package

---

## 🚨 Troubleshooting

### Connection Fails to Launch:

1. **Check VM Status**: Ensure VM shows "Online" in admin panel
2. **Verify Credentials**: Admin should verify username/password are correct
3. **Test Network**: Ensure VM IP is reachable from your network
4. **Check Client**: Verify RDP/SSH client is installed

### Session Not Ending Automatically:

1. **Use Force End**: Click "Force End Session" button in portal
2. **Check Process**: Close any remaining RDP/SSH windows manually
3. **Contact Admin**: If session stays "active" after disconnecting

### Can't See Your VMs:

1. **Check Assignment**: Contact admin to verify VM is assigned to you
2. **Check Status**: VM must be "Online" status to connect
3. **Refresh Page**: Try refreshing the browser page

---

## 💡 Best Practices

### For Admins:

1. **Use Descriptive Names**: Name VMs clearly (e.g., `DEV-API-SERVER`)
2. **Regular Credential Updates**: Rotate VM passwords periodically
3. **Monitor Usage**: Review VM utilization reports monthly
4. **Set Clear Assignments**: Only assign VMs to users who need them
5. **Keep VMs Updated**: Ensure VMs have latest security patches

### For Employees:

1. **End Sessions**: Always close VM connections when done
2. **Report Issues**: Contact admin if connection problems persist
3. **Use Proper VMs**: Only use VMs assigned to you
4. **Work Efficiently**: Session time is tracked - use VMs productively
5. **Log Out Properly**: Close applications before ending VM session

---

## 📋 Quick Reference

### Admin Checklist for New VM:

- [ ] Add VM with correct name and IP
- [ ] Set appropriate OS type and status
- [ ] Configure VM credentials (username + password/key)
- [ ] Assign to employee
- [ ] Test connection works
- [ ] Verify session tracking functions

### Employee Checklist:

- [ ] Check "My VMs" shows assigned VMs
- [ ] Click "Work with VM" to connect
- [ ] Verify connection opens automatically
- [ ] Complete work tasks
- [ ] Close connection properly
- [ ] Confirm session ended in portal

---

## 🎯 Example Configurations

### Development Web Server:
```
Name: DEV-WEB-01
IP: 192.168.1.100
OS: Windows Server 2019
Credentials: Administrator / StrongPassword123!
Port: 3389 (RDP)
Assigned to: Frontend Developer
```

### Linux Build Server:
```
Name: BUILD-LINUX-01  
IP: 10.0.0.25
OS: Ubuntu 20.04
Credentials: builduser / SSH private key
Port: 22 (SSH)
Assigned to: DevOps Engineer
```

### Testing Environment:
```
Name: TEST-ENV-01
IP: 172.16.0.50
OS: Windows 10
Credentials: testuser / TestPass456!
Port: 3389 (RDP)
Assigned to: QA Tester
```

---

## 🔗 Related Documentation

- [Automated VM Connections Guide](./AUTOMATED_VM_CONNECTIONS.md)
- [Admin User Management](./ADMIN_GUIDE.md)
- [Employee Productivity Features](./EMPLOYEE_PRODUCTIVITY_FEATURES.md)
- [API Documentation](./API.md)

---

**✨ Benefits of This System:**

- **No Manual Setup**: Employees get one-click VM access
- **Security**: Credentials never exposed to employees  
- **Tracking**: Automatic work hour logging
- **Cost Effective**: No Azure Bastion subscription needed
- **Cross-Platform**: Works on Windows, Mac, and Linux 