const db = require('../config/database')

async function seedDashboardData() {
  try {
    console.log('🌱 Seeding dashboard test data...')

    // Get existing users
    const [users] = await db.execute('SELECT id, name FROM users WHERE role = ? LIMIT 5', ['employee'])
    
    if (users.length === 0) {
      console.log('❌ No employee users found. Please create users first.')
      return
    }

    console.log(`Found ${users.length} employee users`)

    // Create sample projects for each user
    for (const user of users) {
      console.log(`Creating data for user: ${user.name}`)

      // Create 2-3 projects per user
      const projectCount = Math.floor(Math.random() * 2) + 2
      const userProjects = []

      for (let i = 0; i < projectCount; i++) {
        const projectName = `Project ${String.fromCharCode(65 + i)} - ${user.name.split(' ')[0]}`
        
        // Insert project
        const [projectResult] = await db.execute(`
          INSERT INTO projects (name, description, status, start_date, created_by)
          VALUES (?, ?, ?, ?, ?)
        `, [
          projectName,
          `Description for ${projectName}`,
          Math.random() > 0.2 ? 'active' : 'completed',
          new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          user.id
        ])

        const projectId = projectResult.insertId

        // Assign user to project
        await db.execute(`
          INSERT INTO project_assignments (project_id, user_id, assigned_by, role)
          VALUES (?, ?, ?, ?)
        `, [projectId, user.id, user.id, 'member'])

        userProjects.push({ id: projectId, name: projectName })

        // Create 3-8 tasks per project
        const taskCount = Math.floor(Math.random() * 6) + 3
        const projectTasks = []

        for (let j = 0; j < taskCount; j++) {
          const statuses = ['pending', 'in-progress', 'completed', 'completed', 'completed'] // More completed tasks
          const priorities = ['low', 'medium', 'high', 'medium', 'medium'] // More medium priority
          
          const status = statuses[Math.floor(Math.random() * statuses.length)]
          const priority = priorities[Math.floor(Math.random() * priorities.length)]
          
          const taskName = `Task ${j + 1} - ${projectName.split(' ')[1]}`
          
          const [taskResult] = await db.execute(`
            INSERT INTO tasks (
              project_id, task_name, task_description, status, priority,
              assigned_to, estimated_hours, actual_hours, start_date, end_date, 
              completion_percentage, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            projectId,
            taskName,
            `Detailed description for ${taskName}`,
            status,
            priority,
            user.id,
            Math.floor(Math.random() * 20) + 5, // 5-25 hours estimated
            status === 'completed' ? Math.floor(Math.random() * 15) + 3 : null, // 3-18 actual if completed
            new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status === 'completed' ? new Date().toISOString().split('T')[0] : null,
            status === 'completed' ? 100 : Math.floor(Math.random() * 80) + 10,
            user.id
          ])

          projectTasks.push({ id: taskResult.insertId, name: taskName, status })
        }

        // Create work sessions for this project (last 30 days)
        const sessionCount = Math.floor(Math.random() * 15) + 5 // 5-20 sessions
        
        for (let k = 0; k < sessionCount; k++) {
          const randomDaysAgo = Math.floor(Math.random() * 30)
          const sessionDate = new Date(Date.now() - randomDaysAgo * 24 * 60 * 60 * 1000)
          
          // Random start time between 8 AM and 4 PM
          const startHour = Math.floor(Math.random() * 8) + 8
          const startMinute = Math.floor(Math.random() * 60)
          
          const startTime = new Date(sessionDate)
          startTime.setHours(startHour, startMinute, 0, 0)
          
          // Session duration between 30 minutes and 4 hours
          const durationMinutes = Math.floor(Math.random() * 210) + 30
          const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000)
          
          // Pick a random task from this project
          const randomTask = projectTasks[Math.floor(Math.random() * projectTasks.length)]
          
          await db.execute(`
            INSERT INTO work_sessions (
              user_id, project_id, task_id, session_name, description,
              start_time, end_time, duration_minutes, is_billable
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            user.id,
            projectId,
            randomTask.id,
            `Work on ${randomTask.name}`,
            `Working on ${randomTask.name} for ${projectName}`,
            startTime,
            endTime,
            durationMinutes,
            Math.random() > 0.2 // 80% billable
          ])
        }
      }

      // Create some standalone work_logs (not tied to projects)
      const workLogCount = Math.floor(Math.random() * 10) + 5 // 5-15 work logs
      
      // Get a VM for the user (assuming VMs exist)
      const [userVMs] = await db.execute('SELECT id FROM virtual_machines WHERE assigned_to = ? LIMIT 1', [user.id])
      
      if (userVMs.length > 0) {
        const vmId = userVMs[0].id
        
        for (let l = 0; l < workLogCount; l++) {
          const randomDaysAgo = Math.floor(Math.random() * 30)
          const logDate = new Date(Date.now() - randomDaysAgo * 24 * 60 * 60 * 1000)
          
          const startHour = Math.floor(Math.random() * 8) + 9
          const startMinute = Math.floor(Math.random() * 60)
          
          const startTime = new Date(logDate)
          startTime.setHours(startHour, startMinute, 0, 0)
          
          const durationMinutes = Math.floor(Math.random() * 180) + 30 // 30 min to 3 hours
          const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000)
          
          const workTypes = ['work', 'work', 'work', 'meeting', 'training', 'break']
          const workType = workTypes[Math.floor(Math.random() * workTypes.length)]
          
          await db.execute(`
            INSERT INTO work_logs (
              user_id, vm_id, work_type, task_title, task_description,
              start_time, end_time, duration_minutes, is_billable
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            user.id,
            vmId,
            workType,
            `${workType.charAt(0).toUpperCase() + workType.slice(1)} Session ${l + 1}`,
            `General ${workType} activity for productivity tracking`,
            startTime,
            endTime,
            durationMinutes,
            workType === 'work' || workType === 'meeting'
          ])
        }
      }

      console.log(`✅ Created data for ${user.name}: ${projectCount} projects, ${userProjects.reduce((sum, p) => sum + 5, 0)} tasks, work sessions`)
    }

    console.log('🎉 Dashboard test data seeding completed!')
    
  } catch (error) {
    console.error('❌ Error seeding dashboard data:', error)
  } finally {
    await db.end()
  }
}

// Run if called directly
if (require.main === module) {
  seedDashboardData()
}

module.exports = { seedDashboardData } 