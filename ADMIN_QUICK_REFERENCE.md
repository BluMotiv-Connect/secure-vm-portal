# Admin Quick Reference Guide

## 🚨 Emergency Fixes

### User Can't Delete Project/Task
```
1. Go to Admin Dashboard
2. Click "Debug Project" 
3. Enter Project ID (from error message)
4. Click "Cleanup Project"
5. Enter same Project ID
6. Confirm cleanup
✅ User can now delete
```

### System Shows Fake Active Sessions
```
1. Go to Admin Dashboard → Active Sessions
2. Click "Debug" button
3. If sessions found but none visible:
   - Click "Cleanup Stale" (removes 1hr+ old)
   - OR Click "Force Cleanup All" (removes ALL)
✅ Sessions cleaned up
```

### Dashboard Timeout/Loading Issues
```
1. Click "Debug" instead of waiting for full load
2. Use "Cleanup Stale" to reduce database size
3. If still slow, use "Force Cleanup All"
✅ Performance improved
```

## 🔧 Daily Admin Tasks

### Morning Checklist
- [ ] Check Active Sessions count
- [ ] Review any sessions > 8 hours (red indicators)
- [ ] Run "Cleanup Stale" if needed

### Weekly Maintenance
- [ ] Use "Cleanup Stale" to remove old sessions
- [ ] Review user activity and VM assignments
- [ ] Check for any stuck projects/tasks

### Monthly Tasks
- [ ] Review user accounts and permissions
- [ ] Audit VM assignments and usage
- [ ] Generate usage reports

## 🎯 Button Quick Reference

| Button | Purpose | When to Use |
|--------|---------|-------------|
| **Refresh** | Update session list | Check current status |
| **Debug** | Show simple session info | Troubleshoot issues |
| **Cleanup Stale** | Remove 1hr+ old sessions | Regular maintenance |
| **Force Cleanup All** | Remove ALL sessions | Emergency only |
| **Debug Project** | Check project dependencies | Before cleanup |
| **Cleanup Project** | Remove project dependencies | Fix deletion issues |

## 📊 Session Status Colors

| Color | Duration | Action Needed |
|-------|----------|---------------|
| 🟢 Green | < 4 hours | Normal |
| 🟡 Yellow | 4-8 hours | Monitor |
| 🔴 Red | > 8 hours | Check if stuck |

## 🔍 Troubleshooting Flowchart

```
User reports issue
       ↓
Is it deletion related?
   ↓ YES              ↓ NO
Debug Project    →  Check Active Sessions
       ↓                    ↓
Cleanup Project     Use Cleanup Tools
       ↓                    ↓
   ✅ Fixed           ✅ Fixed
```

## 📞 Escalation Guide

### Level 1 - Use Admin Tools
- Debug and Cleanup buttons
- Session management
- User account issues

### Level 2 - Contact IT
- Database performance issues
- System-wide outages
- Security concerns

### Level 3 - Emergency
- Data loss
- Security breaches
- System completely down

## 💡 Pro Tips

1. **Always Debug First**: Use debug tools before cleanup
2. **Cleanup Regularly**: Weekly stale session cleanup prevents issues
3. **Monitor Red Sessions**: Sessions > 8hrs often need attention
4. **Document Issues**: Keep track of recurring problems
5. **Communicate**: Let users know about maintenance windows

## 🚀 Quick Commands

### Check System Health
```
1. Admin Dashboard
2. Look at Quick Overview numbers
3. Check Active Sessions section
4. Green = Good, Red = Needs attention
```

### Fix Most Common Issues
```
90% of issues fixed by:
1. "Cleanup Stale" (removes old sessions)
2. "Debug Project" + "Cleanup Project" (fixes deletions)
3. "Force Cleanup All" (nuclear option)
```

### Best Practices
- ✅ Run cleanup weekly
- ✅ Monitor session durations
- ✅ Debug before cleanup
- ✅ Document recurring issues
- ❌ Don't use Force Cleanup unless necessary
- ❌ Don't ignore red (8hr+) sessions

---

*Keep this guide handy for quick issue resolution!*