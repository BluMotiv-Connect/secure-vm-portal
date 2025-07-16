# Admin Task Management API

This document describes the admin task management endpoints that allow administrators to create, read, update, and delete tasks across all projects and users.

## Base URL
All admin task endpoints are prefixed with `/api/admin/tasks`

## Authentication
All endpoints require:
- Valid JWT token in Authorization header: `Bearer <token>`
- User must have `admin` role

## Endpoints

### 1. Get All Tasks (with filtering and pagination)

**GET** `/api/admin/tasks`

Retrieve tasks across all projects with filtering and pagination support.

**Query Parameters:**
- `project_id` (optional) - Filter by specific project ID
- `user_id` (optional) - Filter by specific user ID  
- `status` (optional) - Filter by task status (`pending`, `in-progress`, `completed`, `blocked`)
- `search` (optional) - Search tasks by name (case-insensitive partial match)
- `page` (optional, default: 1) - Page number for pagination
- `limit` (optional, default: 20) - Number of tasks per page

**Response:**
```json
{
  "success": true,
  "tasks": [
    {
      "id": 1,
      "project_id": 2,
      "project_outcome_id": "PO-001",
      "task_name": "Frontend Development",
      "dependency": "API design completed",
      "proposed_start_date": "2024-01-15",
      "proposed_end_date": "2024-02-15",
      "actual_start_date": "2024-01-16",
      "actual_end_date": null,
      "status": "in-progress",
      "file_link": "https://example.com/spec.pdf",
      "created_at": "2024-01-10T10:00:00Z",
      "updated_at": "2024-01-20T15:30:00Z",
      "project_name": "Website Redesign",
      "project_status": "active",
      "user_name": "John Doe",
      "user_email": "john@example.com",
      "work_session_count": 5,
      "total_work_minutes": 1200,
      "active_sessions": 0
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 25,
    "totalPages": 2,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 2. Get Tasks for Specific Project

**GET** `/api/admin/tasks/project/:projectId`

Retrieve all tasks for a specific project.

**Path Parameters:**
- `projectId` - Project ID

**Response:**
```json
{
  "success": true,
  "project": {
    "id": 2,
    "name": "Website Redesign",
    "description": "Complete website redesign project",
    "status": "active",
    "user_name": "John Doe",
    "user_email": "john@example.com"
  },
  "tasks": [...]
}
```

### 3. Create New Task

**POST** `/api/admin/tasks`

Create a new task for any project.

**Request Body:**
```json
{
  "project_id": 2,
  "project_outcome_id": "PO-001",
  "task_name": "Frontend Development",
  "dependency": "API design completed",
  "proposed_start_date": "2024-01-15",
  "proposed_end_date": "2024-02-15",
  "status": "pending",
  "file_link": "https://example.com/spec.pdf"
}
```

**Required Fields:**
- `project_id` - Must be valid project ID
- `task_name` - Task name (max 255 characters)

**Optional Fields:**
- `project_outcome_id` - Project outcome identifier
- `dependency` - Task dependencies
- `proposed_start_date` - ISO date string
- `proposed_end_date` - ISO date string
- `status` - Task status (default: `pending`)
- `file_link` - URL to related file/document

**Response:**
```json
{
  "success": true,
  "message": "Task \"Frontend Development\" created for project \"Website Redesign\"",
  "task": {
    "id": 15,
    "project_id": 2,
    "task_name": "Frontend Development",
    "status": "pending",
    "project_name": "Website Redesign",
    "user_name": "John Doe",
    "user_email": "john@example.com",
    "work_session_count": 0,
    "total_work_minutes": 0,
    "active_sessions": 0,
    "created_at": "2024-01-20T10:00:00Z"
  }
}
```

### 4. Update Task

**PUT** `/api/admin/tasks/:id`

Update an existing task.

**Path Parameters:**
- `id` - Task ID

**Request Body:**
```json
{
  "task_name": "Updated Frontend Development",
  "status": "in-progress",
  "actual_start_date": "2024-01-16",
  "dependency": "Updated dependencies"
}
```

**Updatable Fields:**
- `project_outcome_id`
- `task_name`
- `dependency`
- `proposed_start_date`
- `actual_start_date`
- `proposed_end_date`
- `actual_end_date`
- `status`
- `file_link`

**Response:**
```json
{
  "success": true,
  "message": "Task updated successfully",
  "task": {
    "id": 15,
    "task_name": "Updated Frontend Development",
    "status": "in-progress",
    "updated_at": "2024-01-20T15:30:00Z",
    ...
  }
}
```

### 5. Delete Task

**DELETE** `/api/admin/tasks/:id`

Delete a task. Tasks with active work sessions cannot be deleted.

**Path Parameters:**
- `id` - Task ID

**Response:**
```json
{
  "success": true,
  "message": "Task \"Frontend Development\" deleted successfully"
}
```

**Error Response (if task has active sessions):**
```json
{
  "error": "Cannot delete task with active work sessions. End all sessions first."
}
```

### 6. Get Task Statistics

**GET** `/api/admin/tasks/stats`

Retrieve comprehensive task statistics across the system.

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_tasks": 42,
    "pending_tasks": 15,
    "in_progress_tasks": 18,
    "completed_tasks": 8,
    "blocked_tasks": 1,
    "projects_with_tasks": 8,
    "avg_proposed_duration_days": 12.5,
    "total_work_sessions": 156,
    "total_work_minutes": 15840,
    "active_sessions": 3,
    "tasks_with_sessions": 28,
    "total_work_hours": 264,
    "top_projects": [
      {
        "project_name": "Website Redesign",
        "user_name": "John Doe",
        "task_count": 8,
        "completed_task_count": 3
      }
    ]
  }
}
```

## Error Responses

All endpoints may return these error responses:

### 401 Unauthorized
```json
{
  "error": "User not authenticated"
}
```

### 403 Forbidden
```json
{
  "error": "Admin access required",
  "userRole": "employee"
}
```

### 404 Not Found
```json
{
  "error": "Task not found"
}
```
```json
{
  "error": "Project not found"
}
```

### 400 Bad Request
```json
{
  "error": "Project ID and task name are required"
}
```
```json
{
  "error": "No fields to update"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to fetch tasks"
}
```

## Frontend Integration

The admin task management is integrated into the admin project management interface at `/admin/projects` under the "Task Management" tab.

### Key Features:
- **Comprehensive Task Table**: View all tasks across projects with project/user info
- **Advanced Filtering**: Filter by project, user, status, and search by task name
- **Pagination**: Navigate through large task lists efficiently
- **CRUD Operations**: Create, edit, view details, and delete tasks
- **Real-time Work Session Info**: See active sessions and total work time
- **Status Management**: Track task progress with visual status indicators
- **Timeline Tracking**: Manage proposed vs actual dates
- **File Attachments**: Link to related documents and resources

### UI Components:
- `TaskManagement.jsx` - Main task management interface
- `TaskForm.jsx` - Create/edit task modal
- `TaskDetails.jsx` - Detailed task view modal

## Database Schema

Tasks are stored in the `tasks` table with the following structure:

```sql
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  project_outcome_id VARCHAR(100),
  task_name VARCHAR(255) NOT NULL,
  dependency VARCHAR(255),
  proposed_start_date DATE,
  actual_start_date DATE,
  proposed_end_date DATE,
  actual_end_date DATE,
  status VARCHAR(50) DEFAULT 'pending',
  file_link TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Security Considerations

1. **Admin Only Access**: All endpoints require admin role verification
2. **Input Validation**: All inputs are validated and sanitized
3. **Cascade Protection**: Tasks with active work sessions cannot be deleted
4. **Project Verification**: Task creation validates project existence
5. **SQL Injection Prevention**: Parameterized queries used throughout

## Usage Examples

### Create a task for user's project:
```bash
curl -X POST http://localhost:3001/api/admin/tasks \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": 2,
    "task_name": "Database Optimization",
    "status": "pending",
    "proposed_start_date": "2024-02-01",
    "proposed_end_date": "2024-02-15"
  }'
```

### Get tasks for a specific user:
```bash
curl "http://localhost:3001/api/admin/tasks?user_id=5&status=in-progress" \
  -H "Authorization: Bearer <admin_token>"
```

### Update task status:
```bash
curl -X PUT http://localhost:3001/api/admin/tasks/15 \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "actual_end_date": "2024-01-25"
  }'
``` 