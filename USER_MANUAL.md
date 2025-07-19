# Secure VM Portal - Complete User Manual

## Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Employee User Guide](#employee-user-guide)
4. [Administrator Guide](#administrator-guide)
5. [Troubleshooting](#troubleshooting)
6. [FAQ](#faq)

---

## Overview

The Secure VM Portal is a comprehensive work session management system that allows employees to:
- Manage projects and tasks
- Connect to virtual machines securely
- Track work sessions and productivity
- Access cloud-based VMs through various connection methods

Administrators can:
- Monitor active sessions in real-time
- Manage users, VMs, and projects
- Generate reports and analytics
- Resolve system issues and dependencies

---

## Getting Started

### System Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection
- Valid user account credentials

### Accessing the Portal
1. Navigate to the portal URL provided by your administrator
2. Enter your email and password
3. Click "Login"
4. You'll be redirected to your dashboard based on your role (Employee or Admin)

### First Time Setup
- Your administrator will create your account
- You'll receive login credentials via email
- Change your password on first login (recommended)

---

## Employee User Guide

### Dashboard Overview
After logging in, you'll see:
- **Navigation tabs**: Dashboard, Projects & Tasks, Analytics
- **Quick stats**: Active sessions, recent projects
- **Active session indicator**: Shows if you have work in progress

### Project & Task Management

#### Creating a New Project
1. Go to **Projects & Tasks** tab
2. Click **"Add Project"** button
3. Fill in the form:
   - **Project Name** (required)
   - **Description** (optional)
   - **Start Date** (optional)
   - **End Date** (optional)
4. Click **"Add Project"**

#### Managing Projects
- **View Projects**: All your projects are displayed as cards
- **Edit Project**: Click the edit icon (pencil) on any project card
- **Delete Project**: Click the delete icon (trash) - only works if no active sessions exist
- **View Tasks**: Click "View Tasks →" or click on the project card

#### Creating Tasks
1. Select a project to view its tasks
2. Click **"Add Task"** button
3. Fill in the task details:
   - **Task Name** (required)
   - **Project Outcome ID** (optional)
   - **Dependency** (optional)
   - **Status**: Pending, In Progress, Completed, Blocked, Other
   - **Proposed Start/End Dates** (optional)
   - **Actual Start/End Dates** (optional)
   - **File Link** (optional)
4. Click **"Add Task"**

#### Task Management
- **Edit Task**: Click the edit icon in the Actions column
- **Delete Task**: Click the delete icon - only works if no active sessions exist
- **Start Work**: Click the play icon to begin a work session

### Work Sessions

#### Starting a Work Session
1. Navigate to a task you want to work on
2. Click the **play icon** (▶️) in the Actions column
3. Choose your work type:
   - **VM Session**: Work on an assigned virtual machine
   - **Personal Work**: Work on your personal computer
4. If VM session, select from your assigned VMs
5. Click **"Start Session"**

#### VM Connection Methods
Depending on your VM configuration, you'll see different connection options:

**Azure VMs:**
- **Bastion**: Browser-based connection through Azure portal
- **Direct RDP**: Download RDP file for direct connection
- **VPN**: Connect through corporate VPN

**AWS VMs:**
- **Session Manager**: Browser-based terminal through AWS console
- **Direct SSH/RDP**: Direct connection with provided credentials
- **VPN**: Connect through AWS VPN Gateway

**GCP VMs:**
- **Identity-Aware Proxy**: Browser-based SSH through GCP console
- **Direct Connection**: Use gcloud CLI or SSH client
- **VPN**: Connect through Cloud VPN tunnel

#### During a Work Session
- Your session is automatically tracked
- Session duration is calculated in real-time
- You can only have one active session at a time
- The system prevents you from starting multiple sessions

#### Ending a Work Session
1. Close your VM connection (RDP window, browser tab, etc.)
2. Go back to the portal
3. Your session should automatically end, or click **"End Session"** if available

### Analytics & Reporting
- View your work session history
- See productivity statistics
- Track time spent on different projects
- Export session data (if enabled)

---

## Administrator Guide

### Admin Dashboard Overview
The admin dashboard provides:
- **Quick Overview**: Total users, active VMs, active sessions, total VMs
- **Management Cards**: User, VM, Project, and Session management
- **Active Sessions Monitor**: Real-time session tracking
- **Reports & Analytics**: Usage statistics and logs

### User Management
1. Click **"Manage Users →"** from the dashboard
2. **Add New User**:
   - Click "Add User"
   - Fill in user details (name, email, role)
   - Set initial password
   - Assign to projects (optional)
3. **Edit User**: Click edit icon next to user
4. **Delete User**: Click delete icon (removes user and their data)

### Virtual Machine Management
1. Click **"Manage VMs →"** from the dashboard
2. **Add New VM**:
   - VM Name and description
   - IP address and connection details
   - Cloud provider (Azure, AWS, GCP, Other)
   - Connection method (Bastion, Direct, VPN)
   - OS type and specifications
3. **Assign VMs**: Assign VMs to specific users
4. **VM Status**: Monitor online/offline status
5. **Connection Credentials**: Manage VM login credentials securely

### Project Management
1. Click **"Manage Projects →"** from the dashboard
2. **View All Projects**: See projects from all users
3. **Assign Projects**: Assign projects to users
4. **Project Analytics**: View project progress and statistics

### Active Session Management

#### Real-Time Monitoring
The **Active VM Sessions** section shows:
- **User Information**: Name and email of active users
- **VM Details**: Which VM they're connected to
- **Project/Task**: What they're working on
- **Session Duration**: How long they've been active
- **Connection Details**: IP, OS type, cloud provider

#### Session Management Actions
- **Refresh**: Update the session list manually
- **End Individual Session**: Terminate a specific user's session
- **End All Sessions**: Terminate all active sessions (bulk action)
- **Auto-refresh**: Sessions update every 30 seconds automatically

#### Session Duration Indicators
- **Green**: Sessions under 4 hours (normal)
- **Yellow**: Sessions 4-8 hours (long)
- **Red**: Sessions over 8 hours (very long - may need attention)

### Troubleshooting Tools

#### Debug Tools
1. **Debug Button**: 
   - Shows simple session information
   - Identifies stale sessions
   - Helps diagnose deletion issues

2. **Debug Project Button**:
   - Enter a Project ID to check dependencies
   - Shows what's preventing project deletion
   - Identifies blocking database records

#### Cleanup Tools
1. **Cleanup Stale**: 
   - Removes sessions active for over 1 hour
   - Fixes stuck sessions
   - Safe to use regularly

2. **Force Cleanup All**:
   - ⚠️ **Emergency tool** - ends ALL active sessions
   - Use when database is inconsistent
   - Should only be used to fix system issues

3. **Cleanup Project**:
   - Enter Project ID to clean all dependencies
   - Removes work sessions, assignments, temp connections
   - Allows project deletion after cleanup

### Common Admin Tasks

#### Resolving "Cannot Delete" Errors
When users can't delete projects or tasks:

1. **Check Active Sessions**:
   - Go to Active VM Sessions section
   - Look for sessions related to the project/task
   - End those sessions if needed

2. **Debug the Project**:
   - Click "Debug Project"
   - Enter the Project ID (usually shown in error)
   - Review what dependencies exist

3. **Clean Up Dependencies**:
   - Click "Cleanup Project"
   - Enter the same Project ID
   - Confirm the cleanup
   - User should now be able to delete

#### Managing Stale Sessions
If the system shows active sessions but users aren't actually connected:

1. **Use Debug Tool**: Check what sessions exist
2. **Use Cleanup Stale**: Remove old sessions (over 1 hour)
3. **Use Force Cleanup All**: If system is severely inconsistent

#### Performance Issues
If the admin dashboard is slow or timing out:

1. **Check Session Count**: Too many active sessions can slow the system
2. **Use Cleanup Tools**: Remove unnecessary sessions
3. **Monitor Database**: Large numbers of sessions may need cleanup

---

## Troubleshooting

### Common User Issues

#### "Cannot Delete Project/Task"
**Problem**: Error message about existing dependencies or active sessions

**Solution**:
1. Check if you have an active work session - end it first
2. If no active session, contact your administrator
3. Administrator can use cleanup tools to resolve dependencies

#### "VM Connection Failed"
**Problem**: Cannot connect to assigned virtual machine

**Solutions**:
1. **Check VM Status**: Ensure VM is online
2. **Verify Credentials**: Contact admin if login fails
3. **Network Issues**: Check your internet connection
4. **Browser Issues**: Try different browser or clear cache
5. **VPN Required**: Some VMs require VPN connection first

#### "Session Won't End"
**Problem**: Work session appears stuck as active

**Solutions**:
1. **Refresh the page**: Sometimes UI needs refresh
2. **Close all VM connections**: Ensure RDP/SSH windows are closed
3. **Contact Administrator**: Admin can force-end your session

#### "Cannot Start New Session"
**Problem**: Error when trying to start work session

**Solutions**:
1. **Check Active Sessions**: You can only have one active session
2. **End Previous Session**: Make sure previous work is properly ended
3. **Wait and Retry**: Sometimes there's a brief delay
4. **Contact Administrator**: If issue persists

### Common Admin Issues

#### "Active Sessions Not Loading"
**Problem**: Admin dashboard shows timeout or loading errors

**Solutions**:
1. **Use Simple Debug**: Click Debug button for basic info
2. **Check Database Performance**: Large session tables can cause timeouts
3. **Use Cleanup Tools**: Remove old sessions to improve performance
4. **Restart Services**: May need backend restart (contact IT)

#### "Database Inconsistencies"
**Problem**: Sessions show as active but users aren't connected

**Solutions**:
1. **Use Debug Tools**: Identify what sessions exist
2. **Use Cleanup Stale**: Remove sessions over 1 hour old
3. **Use Force Cleanup All**: Emergency cleanup of all sessions
4. **Regular Maintenance**: Schedule regular cleanup tasks

---

## FAQ

### For Employees

**Q: How many work sessions can I have at once?**
A: Only one active session at a time. You must end your current session before starting a new one.

**Q: What happens if I close my browser during a session?**
A: Your session may remain active in the system. Try to properly end sessions, but administrators can clean up stuck sessions.

**Q: Can I work on multiple projects simultaneously?**
A: No, each work session is tied to one specific task within one project.

**Q: How long can a work session last?**
A: There's no hard limit, but sessions over 8 hours are flagged for administrator review.

**Q: What if I can't connect to my assigned VM?**
A: Contact your administrator. They can check VM status, verify credentials, and troubleshoot connection issues.

### For Administrators

**Q: How often should I clean up stale sessions?**
A: Weekly cleanup is recommended, or whenever you notice performance issues.

**Q: Is it safe to use "Force Cleanup All"?**
A: Yes, but it will end ALL active sessions. Use only when necessary to fix system issues.

**Q: What's the difference between ending a session and cleaning up dependencies?**
A: Ending a session stops active work. Cleaning up dependencies removes database records that prevent deletion.

**Q: How do I know if a session is really active or just stuck?**
A: Use the Debug tools to see session details. Sessions over 1 hour old are often stuck.

**Q: Can I recover deleted projects or tasks?**
A: No, deletion is permanent. The cleanup tools are designed to remove blocking dependencies, not recover data.

### Technical Questions

**Q: What browsers are supported?**
A: Modern versions of Chrome, Firefox, Safari, and Edge. Chrome is recommended for best VM connectivity.

**Q: Do I need special software for VM connections?**
A: For RDP connections, you'll need Remote Desktop Client (built into Windows, downloadable for Mac/Linux). SSH connections work through browser or terminal.

**Q: Is my work session data secure?**
A: Yes, all connections are encrypted and session data is stored securely. VM credentials are encrypted in the database.

**Q: Can I use the system on mobile devices?**
A: The web interface works on mobile, but VM connections require desktop/laptop for proper functionality.

---

## Support

### Getting Help
1. **Check this manual first** for common solutions
2. **Contact your administrator** for account or permission issues
3. **Submit IT ticket** for technical problems
4. **Emergency issues**: Contact your IT support team directly

### Reporting Issues
When reporting problems, include:
- Your username/email
- What you were trying to do
- Error messages (exact text)
- Browser and operating system
- Screenshots if helpful

### System Status
- Check with your administrator for planned maintenance
- System updates may temporarily affect functionality
- Active sessions are preserved during minor updates

---

*This manual covers the complete Secure VM Portal system. For additional features or custom configurations, consult your system administrator.*

**Last Updated**: [Current Date]
**Version**: 1.0
**System**: Secure VM Portal