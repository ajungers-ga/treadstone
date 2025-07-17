// routes/courses.js

const express = require('express')
const { isAdmin } = require('../middleware/auth') // 1. Import admin middleware

function createCoursesRouter(pool) {
  const router = express.Router()

  // 2. Public route - get all courses
  router.get('/', async (req, res) => {
    const db = await pool.connect()
    try {
      const result = await db.query('SELECT * FROM courses ORDER BY name')
      res.json(result.rows)
    } catch (err) {
      console.error('Error fetching courses:', err)
      res.status(500).json({ error: 'Failed to fetch courses' })
    } finally {
      db.release()
    }
  })

  // 3. Public route - get one course by ID
  router.get('/:id', async (req, res) => {
    const db = await pool.connect()
    try {
      const result = await db.query('SELECT * FROM courses WHERE id = $1', [req.params.id])
      if (result.rowCount === 0) {
        res.status(404).json({ error: 'Course not found' })
      } else {
        res.json(result.rows[0])
      }
    } catch (err) {
      console.error('Error fetching course:', err)
      res.status(500).json({ error: 'Failed to fetch course' })
    } finally {
      db.release()
    }
  })

  // 4. Protected route - create a new course
  router.post('/', isAdmin, async (req, res) => {
    const { name, location, par, yardage } = req.body
    const db = await pool.connect()
    try {
      const result = await db.query(
        `INSERT INTO courses (name, location, par, yardage)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [name, location, par, yardage]
      )

      const newCourse = result.rows[0]

      res.status(201).json({
        message: 'Course created',
        course_id: newCourse.id,
        data: newCourse
      })
    } catch (err) {
      console.error('Error creating course:', err)
      res.status(500).json({ error: 'Failed to create course' })
    } finally {
      db.release()
    }
  })

  // 5. Protected route - update a course by ID
  router.put('/:id', isAdmin, async (req, res) => {
    const { name, location, par, yardage } = req.body
    const db = await pool.connect()
    try {
      const result = await db.query(
        `UPDATE courses
         SET name = $1,
             location = $2,
             par = $3,
             yardage = $4
         WHERE id = $5
         RETURNING *`,
        [name, location, par, yardage, req.params.id]
      )

      if (result.rowCount === 0) {
        res.status(404).json({ error: 'Course not found' })
      } else {
        res.json({
          message: 'Course updated',
          course_id: result.rows[0].id,
          data: result.rows[0]
        })
      }
    } catch (err) {
      console.error('Error updating course:', err)
      res.status(500).json({ error: 'Failed to update course' })
    } finally {
      db.release()
    }
  })

  // 6. Protected route - delete a course by ID
  router.delete('/:id', isAdmin, async (req, res) => {
    const db = await pool.connect()
    try {
      const result = await db.query('DELETE FROM courses WHERE id = $1 RETURNING *', [req.params.id])

      if (result.rowCount === 0) {
        res.status(404).json({ error: 'Course not found' })
      } else {
        res.json({
          message: 'Course deleted',
          course_id: result.rows[0].id
        })
      }
    } catch (err) {
      console.error('Error deleting course:', err)
      res.status(500).json({ error: 'Failed to delete course' })
    } finally {
      db.release()
    }
  })

  // 7. Return the router
  return router
}

module.exports = createCoursesRouter
