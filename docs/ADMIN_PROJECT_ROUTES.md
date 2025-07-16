# Admin Project Management API Routes

This document describes the admin-specific project management API endpoints that allow administrators to manage projects across all users.

## Base URL
All admin project routes are prefixed with: `/api/admin/projects`

## Authentication
All routes require:
- Valid JWT authentication token
- Admin role (`role: 'admin'`)

## Routes

### 1. Get All Projects (with filtering & pagination)
```http
GET /api/admin/projects
```

**Query Parameters:**
- `user_id` (optional) - Filter by specific user ID
- `status` (optional) - Filter by project status (active, completed, on-hold)
- `start_date` (optional) - Filter projects starting from this date (YYYY-MM-DD)
- `end_date` (optional) - Filter projects ending before this date (YYYY-MM-DD)
- `search` (optional) - Search in project name, description, or user name
- `page` (optional, default: 1) - Page number for pagination
- `limit` (optional, default: 20) - Number of results per page
- `sort_by` (optional, default: 'created_at') - Sort field
- `sort_order` (optional, default: 'DESC') - Sort direction

**Response:**
```json
{
  "success": true,
  "projects": [
    {
      "id": 1,
      "name": "Website Redesign",
      "description": "Complete website overhaul",
      "user_id": 2,
      "user_name": "John Doe",
      "user_email": "john@example.com",
      "status": "active",
      "start_date": "2024-01-01",
      "end_date": "2024-03-01",
      "task_count": 12,
      "completed_tasks": 5,
      "total_work_sessions": 25,
      "total_work_minutes": 1500,
      "timeline_status": "current",
      "created_at": "2024-01-01T10:00:00Z",
      "updated_at": "2024-01-15T15:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 2. Get Projects for Specific User
```http
GET /api/admin/projects/user/:userId
```

**Query Parameters:**
- `include_tasks` (optional, default: false) - Include task details

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 2,
    "name": "John Doe",
    "email": "john@example.com"
  },
  "projects": [...]
}
```

### 3. Create New Project
```http
POST /api/admin/projects
```

**Request Body:**
```json
{
  "name": "New Project",
  "description": "Project description",
  "user_id": 2,
  "status": "active",
  "start_date": "2024-01-01",
  "end_date": "2024-03-01"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Project \"New Project\" created and assigned to John Doe",
  "project": { ... }
}
```

### 4. Update Project
```http
PUT /api/admin/projects/:id
```

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Project Name",
  "description": "Updated description",
  "user_id": 3,
  "status": "completed",
  "start_date": "2024-01-01",
  "end_date": "2024-02-15"
}
```

### 5. Assign/Reassign Project
```http
POST /api/admin/projects/:id/assign
```

**Request Body:**
```json
{
  "user_id": 3
}
```

### 6. Delete Project
```http
DELETE /api/admin/projects/:id
```

**Note:** Cannot delete projects with active work sessions.

### 7. Get Project Statistics
```http
GET /api/admin/projects/stats
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_projects": 45,
    "active_projects": 20,
    "completed_projects": 18,
    "on_hold_projects": 7,
    "users_with_projects": 12,
    "avg_project_duration_days": 65.5,
    "total_tasks": 340,
    "completed_tasks": 180,
    "pending_tasks": 160,
    "total_work_sessions": 890,
    "total_work_minutes": 45600,
    "active_sessions": 8,
    "total_work_hours": 760
  }
}
```

### 8. Get User Workload Summary
```http
GET /api/admin/projects/workload
```

**Response:**
```json
{
  "success": true,
  "workload": [
    {
      "id": 2,
      "name": "John Doe",
      "email": "john@example.com",
      "total_projects": 5,
      "active_projects": 3,
      "completed_projects": 2,
      "total_tasks": 45,
      "completed_tasks": 20,
      "total_work_minutes": 2400,
      "active_sessions": 2,
      "total_work_hours": 40,
      "project_completion_rate": 40,
      "task_completion_rate": 44
    }
  ]
}
```

### 9. Get Project Analytics
```http
GET /api/admin/projects/analytics?days=30
```

**Response:**
```json
{
  "success": true,
  "analytics": {
    "daily_stats": [
      {
        "date": "2024-01-15",
        "projects_created": 2,
        "projects_completed": 1,
        "unique_users": 3,
        "avg_tasks_per_project": 8.5
      }
    ],
    "health_metrics": {
      "total_projects": 45,
      "active_projects": 20,
      "completed_projects": 18,
      "on_hold_projects": 7,
      "overdue_projects": 3,
      "avg_duration_days": 65.5,
      "users_with_projects": 12
    }
  }
}
```

### 10. Get Available Users
```http
GET /api/admin/projects/available-users
```

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": 2,
      "name": "John Doe",
      "email": "john@example.com",
      "current_projects": 5,
      "active_projects": 3,
      "last_project_assigned": "2024-01-10T14:30:00Z"
    }
  ]
}
```

### 11. Bulk Update Projects
```http
PATCH /api/admin/projects/bulk-update
```

**Request Body:**
```json
{
  "project_ids": [1, 2, 3, 4],
  "updates": {
    "status": "on-hold",
    "user_id": 5
  }
}
```

### 12. Get Project Tasks
```http
GET /api/admin/projects/:id/tasks
```

**Response:**
```json
{
  "success": true,
  "project": { ... },
  "tasks": [
    {
      "id": 1,
      "task_name": "Design mockups",
      "status": "completed",
      "work_session_count": 5,
      "total_work_minutes": 300,
      "active_sessions": 0
    }
  ]
}
```

## Error Responses

All endpoints return standardized error responses:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (admin access required)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

## Usage Examples

### Create and assign a new project:
```bash
curl -X POST http://localhost:3001/api/admin/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mobile App Development",
    "description": "Develop new mobile application",
    "user_id": 2,
    "start_date": "2024-02-01",
    "end_date": "2024-05-01"
  }'
```

### Get all active projects for a specific user:
```bash
curl "http://localhost:3001/api/admin/projects?user_id=2&status=active" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Reassign a project to a different user:
```bash
curl -X POST http://localhost:3001/api/admin/projects/5/assign \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id": 3}'
``` 