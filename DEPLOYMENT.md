# Deployment Guide for Render

This guide will help you deploy the Secure VM Portal to Render with PostgreSQL.

## Prerequisites

1. **Render Account**: Sign up at [render.com](https://render.com)
2. **GitHub Repository**: Your code should be pushed to GitHub
3. **Azure AD App**: Set up Azure AD application for authentication

## Step 1: Prepare Your Environment Variables

### Backend Environment Variables (Required)
```
NODE_ENV=production
DATABASE_URL=postgresql://secure_vm_portal_user:u4fwpipFUbVdt6kXl5XKGPhdEg8AWipU@dpg-d1pdmejipnbc73fuqtk0-a.oregon-postgres.render.com/secure_vm_portal_s3ww
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters-long
JWT_EXPIRES_IN=8h
FRONTEND_URL=https://your-frontend-app.onrender.com
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret
AZURE_TENANT_ID=your-azure-tenant-id
ENCRYPTION_KEY=your-32-character-encryption-key-here
```

### Frontend Environment Variables (Required)
```
VITE_API_BASE_URL=https://your-backend-app.onrender.com/api
VITE_AZURE_CLIENT_ID=your-azure-client-id
VITE_AZURE_TENANT_ID=your-azure-tenant-id
VITE_AZURE_REDIRECT_URI=https://your-frontend-app.onrender.com
```

## Step 2: Deploy Database Schema

Before deploying your application, you need to set up the database schema on Render.

### Option A: Using the Deployment Script (Recommended)

1. **Set up your local environment**:
   ```bash
   # Install dependencies
   npm install
   
   # Set the DATABASE_URL environment variable
   export DATABASE_URL="postgresql://secure_vm_portal_user:u4fwpipFUbVdt6kXl5XKGPhdEg8AWipU@dpg-d1pdmejipnbc73fuqtk0-a.oregon-postgres.render.com/secure_vm_portal_s3ww"
   
   # Run the deployment script
   npm run deploy-db
   ```

### Option B: Manual Database Setup

1. **Connect to your Render PostgreSQL database**:
   ```bash
   psql "postgresql://secure_vm_portal_user:u4fwpipFUbVdt6kXl5XKGPhdEg8AWipU@dpg-d1pdmejipnbc73fuqtk0-a.oregon-postgres.render.com/secure_vm_portal_s3ww"
   ```

2. **Execute the schema file**:
   ```sql
   \i database/render_setup.sql
   ```

## Step 3: Deploy to Render

### Method 1: Using render.yaml (Recommended)

1. **Push your code to GitHub** with the `render.yaml` file in the root directory.

2. **Connect your GitHub repository** to Render:
   - Go to your Render dashboard
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Render will automatically detect the `render.yaml` file

3. **Set environment variables** in the Render dashboard for both services.

### Method 2: Manual Service Creation

#### Backend Service
1. **Create a new Web Service**:
   - Name: `secure-vm-portal-backend`
   - Environment: `Node`
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && npm start`
   - Plan: `Starter` (or higher)

2. **Set Environment Variables** (see Step 1)

3. **Set Health Check Path**: `/api/health`

#### Frontend Service
1. **Create a new Static Site**:
   - Name: `secure-vm-portal-frontend`
   - Build Command: `cd frontend && npm install && npm run build`
   - Publish Directory: `frontend/dist`

2. **Set Environment Variables** (see Step 1)

## Step 4: Configure Azure AD

Update your Azure AD app registration with the new Render URLs:

1. **Redirect URIs**:
   - Add: `https://your-frontend-app.onrender.com`
   - Add: `https://your-frontend-app.onrender.com/auth/callback`

2. **CORS Origins**:
   - Add: `https://your-frontend-app.onrender.com`

## Step 5: Update Environment Variables

After deployment, update the environment variables with the actual Render URLs:

### Backend
```
FRONTEND_URL=https://secure-vm-portal-frontend.onrender.com
```

### Frontend
```
VITE_API_BASE_URL=https://secure-vm-portal-backend.onrender.com/api
VITE_AZURE_REDIRECT_URI=https://secure-vm-portal-frontend.onrender.com
```

## Step 6: Verify Deployment

1. **Check Backend Health**:
   ```
   https://your-backend-app.onrender.com/api/health
   ```

2. **Check Frontend**:
   ```
   https://your-frontend-app.onrender.com
   ```

3. **Test Authentication**:
   - Try logging in with Azure AD
   - Verify admin user access

## Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Verify DATABASE_URL is correct
   - Check if database schema is deployed
   - Ensure SSL is enabled for production

2. **CORS Errors**:
   - Verify FRONTEND_URL in backend environment
   - Check Azure AD redirect URIs

3. **Authentication Issues**:
   - Verify Azure AD configuration
   - Check JWT_SECRET is set
   - Ensure redirect URIs match

### Logs

Check application logs in the Render dashboard:
- Go to your service
- Click on "Logs" tab
- Look for error messages

### Database Verification

Connect to your database and verify tables exist:
```sql
\dt
SELECT * FROM users WHERE role = 'admin';
```

## Security Considerations

1. **Environment Variables**: Never commit sensitive environment variables to Git
2. **JWT Secret**: Use a strong, randomly generated secret
3. **Database**: Ensure SSL is enabled for database connections
4. **HTTPS**: Render provides HTTPS by default
5. **CORS**: Configure CORS properly to prevent unauthorized access

## Performance Optimization

1. **Database Indexing**: The schema includes performance indexes
2. **Connection Pooling**: PostgreSQL connection pooling is configured
3. **Rate Limiting**: Production rate limiting is enabled
4. **Caching**: Consider adding Redis for session caching (optional)

## Monitoring

1. **Health Checks**: Backend includes health check endpoint
2. **Logs**: Monitor application logs in Render dashboard
3. **Database**: Monitor database performance in Render
4. **Uptime**: Set up uptime monitoring (optional)

## Backup Strategy

1. **Database Backups**: Render provides automatic database backups
2. **Code Backups**: Code is backed up in GitHub
3. **Environment Variables**: Document environment variables securely

## Support

If you encounter issues:
1. Check the logs in Render dashboard
2. Verify environment variables
3. Test database connectivity
4. Check Azure AD configuration
5. Review this deployment guide

## Next Steps

After successful deployment:
1. Add users through the admin interface
2. Configure virtual machines
3. Set up projects and tasks
4. Monitor application performance
5. Set up regular backups