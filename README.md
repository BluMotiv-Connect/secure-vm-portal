# Secure VM Portal

A comprehensive web-based portal for managing virtual machines, projects, tasks, and work sessions with secure access control and time tracking capabilities.

## 🚀 Live Demo

- **Frontend**: [https://secure-vm-portal-frontend.onrender.com](https://secure-vm-portal-frontend.onrender.com)
- **Backend API**: [https://secure-vm-portal-backend.onrender.com](https://secure-vm-portal-backend.onrender.com)
- **Health Check**: [https://secure-vm-portal-backend.onrender.com/api/health](https://secure-vm-portal-backend.onrender.com/api/health)

## 📋 Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Quick Start](#quick-start)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## Features

### 🔐 Authentication & Authorization
- Azure Active Directory integration
- Role-based access control (Admin/Employee)
- JWT token-based authentication
- Secure session management

### 👥 User Management (Admin)
- User registration and profile management
- Role assignment and permissions
- User activity monitoring
- Account activation/deactivation

### 🖥️ Virtual Machine Management
- VM assignment to users
- Multi-cloud support (Azure, AWS, GCP)
- RDP/SSH connection management
- VM status monitoring and health checks
- Automated connection file generation

### 📋 Project Management
- **Employee Features:**
  - View assigned projects
  - Create and manage tasks within projects
  - Track project progress
  
- **Admin Features:**
  - Create and assign projects to users
  - Comprehensive project oversight across all users
  - Project statistics and analytics
  - User workload distribution analysis

### ✅ Task Management
- **Employee Features:**
  - Create, edit, and delete tasks within assigned projects
  - Set task dependencies and timelines
  - Attach files and documents to tasks
  - Track task progress and status
  
- **Admin Features:**
  - **NEW:** Create and manage tasks across all projects and users
  - Advanced task filtering and search capabilities
  - Bulk task operations and status updates
  - Task analytics and completion tracking
  - View task work sessions and time tracking

### ⏱️ Time Tracking & Work Sessions
- Real-time work session tracking
- VM-based and personal computer work logging
- Automatic session management
- Work session history and analytics
- Productivity metrics and reporting

### 📊 Reporting & Analytics
- Work time reports and summaries
- Project progress tracking
- User productivity analytics
- VM usage statistics
- Exportable reports (Excel, PDF)

### 🏢 Multi-tenant Architecture
- Organization-level data isolation
- Scalable user management
- Configurable access controls
- Custom branding support

## Technology Stack

### Backend
- **Runtime:** Node.js with Express.js
- **Database:** PostgreSQL with connection pooling
- **Authentication:** JWT with bcrypt password hashing
- **Cloud Integration:** Azure SDK, AWS SDK, Google Cloud SDK
- **Security:** Helmet.js, CORS, rate limiting
- **API Documentation:** RESTful endpoints with comprehensive error handling

### Frontend
- **Framework:** React 18 with modern hooks
- **Routing:** React Router v6
- **Styling:** Tailwind CSS with responsive design
- **Icons:** Lucide React icon library
- **Build Tool:** Vite for fast development and production builds
- **State Management:** Context API with custom hooks

### Database Schema
- Users, Projects, Tasks, and Work Sessions
- VM assignments and credentials
- Audit logs and session tracking
- Comprehensive relational design with proper indexing

## Quick Start

### Prerequisites
- Node.js 16+ and npm
- PostgreSQL 12+
- Git

### Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd secure-vm-portal
```

2. **Backend Setup:**
```bash
cd backend
npm install
cp .env.example .env
# Configure your environment variables
npm run setup:database
npm start
```

3. **Frontend Setup:**
```bash
cd frontend
npm install
npm run dev
```

4. **Database Initialization:**
```bash
cd backend
npm run setup:admin-user
npm run seed:sample-data
```

### Environment Configuration

Create `.env` file in the backend directory:
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/secure_vm_portal

# Authentication
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=24h

# Azure AD (if using)
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret
AZURE_TENANT_ID=your-azure-tenant-id

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## API Documentation

### Admin Project Management
- [Admin Project Routes](docs/ADMIN_PROJECT_ROUTES.md) - Project management for administrators

### Admin Task Management ⭐ NEW
- [Admin Task Routes](docs/ADMIN_TASK_ROUTES.md) - Comprehensive task management across all projects

### General API
- [API Documentation](docs/API.md) - Complete API reference
- [User Guide](docs/USER_GUIDE.md) - End-user documentation
- [Admin Guide](docs/ADMIN_GUIDE.md) - Administrator documentation

## Project Structure

```
secure-vm-portal/
├── backend/                 # Node.js/Express backend
│   ├── routes/             # API route handlers
│   │   ├── adminProjectRoutes.js    # Admin project management
│   │   ├── adminTaskRoutes.js       # Admin task management (NEW)
│   │   └── ...
│   ├── middleware/         # Authentication, validation, etc.
│   ├── services/           # Business logic layer
│   └── config/            # Database and app configuration
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   │   ├── admin/    # Admin-specific components
│   │   │   │   ├── TaskManagement.jsx     # NEW: Admin task interface
│   │   │   │   ├── TaskForm.jsx           # NEW: Task creation/editing
│   │   │   │   ├── TaskDetails.jsx        # NEW: Task detail view
│   │   │   │   └── ...
│   │   │   └── employee/ # Employee-specific components
│   │   ├── pages/        # Main application pages
│   │   ├── hooks/        # Custom React hooks
│   │   └── services/     # API client and utilities
├── database/              # Database schemas and migrations
├── docs/                  # Documentation
└── scripts/              # Setup and utility scripts
```

## Key Features Deep Dive

### Admin Task Management (New Feature)

The latest addition to the Secure VM Portal is comprehensive admin task management that allows administrators to:

#### 🎯 **Cross-Project Task Creation**
- Create tasks for any project across all users
- Assign tasks with full project context visibility
- Set dependencies, timelines, and priorities

#### 🔍 **Advanced Filtering & Search**
- Filter by project, user, status, or date range
- Real-time search across task names
- Pagination for handling large task lists

#### 📊 **Task Analytics Dashboard**
- Task completion rates by project/user
- Work time tracking and session monitoring
- Project progress visualization

#### 🛠️ **Comprehensive Task Management**
- Full CRUD operations (Create, Read, Update, Delete)
- Status management with visual indicators
- File attachment and documentation linking
- Timeline tracking (proposed vs actual dates)

#### 💼 **Business Intelligence**
- User workload distribution analysis
- Project completion forecasting
- Resource allocation insights

### Integration Points

The admin task management seamlessly integrates with existing features:

- **Project Management:** Tasks are linked to projects and users
- **Time Tracking:** Work sessions are automatically associated with tasks
- **User Management:** Admin can see task distribution across all users
- **Reporting:** Task data feeds into comprehensive analytics

## Security Features

### Authentication & Authorization
- Multi-factor authentication support
- Role-based access control (RBAC)
- Session timeout and refresh token handling
- Secure password policies with bcrypt hashing

### Data Protection
- SQL injection prevention with parameterized queries
- XSS protection with input sanitization
- CSRF protection with secure headers
- Rate limiting to prevent abuse

### Infrastructure Security
- HTTPS enforcement in production
- Secure cookie handling
- Database connection encryption
- Environment variable protection

## Deployment

### Production Setup
1. Configure production environment variables
2. Set up SSL certificates
3. Configure reverse proxy (nginx recommended)
4. Set up database backups
5. Configure monitoring and logging

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Manual Deployment
```bash
# Backend
cd backend
npm install --production
npm run build
npm start

# Frontend
cd frontend
npm install
npm run build
# Serve build folder with nginx or similar
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

### Development Guidelines
- Follow ESLint configuration for code style
- Write comprehensive tests for new features
- Update documentation for API changes
- Use conventional commit messages

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Check the [documentation](docs/) directory
- Review the [API documentation](docs/API.md)
- Create an issue for bugs or feature requests

## Changelog

### Latest Release - v2.1.0
- ✨ **NEW:** Admin Task Management System
  - Cross-project task creation and management
  - Advanced filtering and search capabilities
  - Task analytics and reporting
  - Integration with existing work session tracking

### v2.0.0
- 🎉 **NEW:** Admin Project Management System
- 📊 Enhanced reporting and analytics
- 🔧 Improved user interface and experience
- 🐛 Various bug fixes and performance improvements

### v1.0.0
- 🚀 Initial release with core VM portal functionality
- 👥 User management and authentication
- 🖥️ Virtual machine management and connections
- ⏱️ Basic time tracking and work sessions
