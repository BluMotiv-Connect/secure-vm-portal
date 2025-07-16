# Deployment Checklist for Render

## ✅ Pre-Deployment Checklist

### 1. Code Preparation
- [x] Database schema created (`database/render_setup.sql`)
- [x] Production environment files created
- [x] CORS configuration updated for production
- [x] Rate limiting configured for production
- [x] Database connection updated for production
- [x] Deployment scripts created
- [x] .gitignore file updated
- [x] README updated with deployment info

### 2. Environment Variables Setup

#### Backend Environment Variables (Required)
```bash
NODE_ENV=production
DATABASE_URL=postgresql://secure_vm_portal_user:u4fwpipFUbVdt6kXl5XKGPhdEg8AWipU@dpg-d1pdmejipnbc73fuqtk0-a.oregon-postgres.render.com/secure_vm_portal_s3ww
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters-long
JWT_EXPIRES_IN=8h
FRONTEND_URL=https://secure-vm-portal-frontend.onrender.com
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret
AZURE_TENANT_ID=your-azure-tenant-id
ENCRYPTION_KEY=your-32-character-encryption-key-here
```

#### Frontend Environment Variables (Required)
```bash
VITE_API_BASE_URL=https://secure-vm-portal-backend.onrender.com/api
VITE_AZURE_CLIENT_ID=your-azure-client-id
VITE_AZURE_TENANT_ID=your-azure-tenant-id
VITE_AZURE_REDIRECT_URI=https://secure-vm-portal-frontend.onrender.com
```

### 3. Database Setup
- [x] Database connection tested
- [x] Schema deployment script tested
- [x] Admin users verified in production database

## 🚀 Deployment Steps

### Step 1: Push to GitHub
```bash
git add .
git commit -m "feat: prepare for Render deployment with complete database schema and production config"
git push origin main
```

### Step 2: Deploy Database Schema
```bash
# Run this locally to set up the database on Render
npm run deploy-db
```

### Step 3: Deploy to Render

#### Option A: Using render.yaml (Recommended)
1. Connect GitHub repository to Render
2. Render will auto-detect `render.yaml`
3. Set environment variables in Render dashboard

#### Option B: Manual Service Creation
1. Create Backend Web Service
2. Create Frontend Static Site
3. Configure environment variables

### Step 4: Configure Azure AD
- Update redirect URIs with Render URLs
- Update CORS origins

### Step 5: Verify Deployment
- [ ] Backend health check: `https://your-backend.onrender.com/api/health`
- [ ] Frontend loads: `https://your-frontend.onrender.com`
- [ ] Authentication works
- [ ] Database operations work

## 🔧 Post-Deployment Configuration

### 1. Update Environment Variables
After getting actual Render URLs, update:
- `FRONTEND_URL` in backend
- `VITE_API_BASE_URL` in frontend
- `VITE_AZURE_REDIRECT_URI` in frontend

### 2. Azure AD Configuration
- Add Render URLs to redirect URIs
- Update CORS settings

### 3. Test All Features
- [ ] User authentication
- [ ] Project management
- [ ] Task management
- [ ] VM management
- [ ] Work session tracking
- [ ] Admin functions

## 🛠️ Troubleshooting

### Common Issues
1. **Database Connection**: Verify DATABASE_URL
2. **CORS Errors**: Check FRONTEND_URL setting
3. **Authentication**: Verify Azure AD configuration
4. **Build Errors**: Check environment variables

### Useful Commands
```bash
# Test database connection locally
npm run deploy-db

# Check backend health
curl https://your-backend.onrender.com/api/health

# View logs in Render dashboard
# Go to service -> Logs tab
```

## 📊 Monitoring

### Health Checks
- Backend: `/api/health`
- Database: Connection pooling status
- Frontend: Static site availability

### Performance
- Monitor response times
- Check database query performance
- Monitor memory usage

## 🔒 Security Checklist

- [ ] Environment variables secured
- [ ] JWT secrets are strong
- [ ] Database SSL enabled
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation in place

## 📝 Documentation

- [x] README updated
- [x] Deployment guide created
- [x] API documentation available
- [x] Environment variables documented

## 🎯 Success Criteria

- [ ] Application loads without errors
- [ ] Users can authenticate with Azure AD
- [ ] Admin can manage users, projects, and tasks
- [ ] Employees can create projects and tasks
- [ ] Work sessions can be tracked
- [ ] All API endpoints respond correctly
- [ ] Database operations work properly
- [ ] No console errors in browser
- [ ] Mobile responsive design works

## 📞 Support

If deployment fails:
1. Check Render service logs
2. Verify environment variables
3. Test database connection
4. Check Azure AD configuration
5. Review this checklist

## 🎉 Deployment Complete!

Once all items are checked:
- [ ] Application is live on Render
- [ ] All features tested and working
- [ ] Documentation updated
- [ ] Team notified of new URLs
- [ ] Monitoring set up