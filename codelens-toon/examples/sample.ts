/**
 * Sample TypeScript file for testing CodeLens-TOON
 */

import { Router } from 'express'
import { UserModel } from './models/user'

// Type definitions
export interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'user'
}

export interface LoginCredentials {
  email: string
  password: string
}

// Authentication Service Class
export class AuthService {
  private tokenSecret: string

  constructor(secret: string) {
    this.tokenSecret = secret
  }

  /**
   * Authenticate user with credentials
   */
  async login(credentials: LoginCredentials): Promise<User | null> {
    const user = await UserModel.findByEmail(credentials.email)

    if (!user) {
      return null
    }

    const isValid = await this.verifyPassword(credentials.password, user.passwordHash)

    if (!isValid) {
      return null
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    }
  }

  /**
   * Verify password hash
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    // Simplified - in reality would use bcrypt
    return password === hash
  }

  /**
   * Generate JWT token
   */
  generateToken(user: User): string {
    return `token_${user.id}_${this.tokenSecret}`
  }

  /**
   * Validate JWT token
   */
  validateToken(token: string): boolean {
    return token.startsWith('token_') && token.includes(this.tokenSecret)
  }
}

// Session Manager Class
export class SessionManager {
  private sessions: Map<string, User>

  constructor() {
    this.sessions = new Map()
  }

  createSession(user: User): string {
    const sessionId = `session_${Date.now()}_${user.id}`
    this.sessions.set(sessionId, user)
    return sessionId
  }

  getSession(sessionId: string): User | undefined {
    return this.sessions.get(sessionId)
  }

  destroySession(sessionId: string): boolean {
    return this.sessions.delete(sessionId)
  }
}

// Utility functions
export function hashPassword(password: string): string {
  // Simplified hashing
  return `hashed_${password}`
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export async function sendWelcomeEmail(user: User): Promise<void> {
  console.log(`Sending welcome email to ${user.email}`)
  // Email sending logic would go here
}

// Route handler
export function createAuthRoutes(): Router {
  const router = Router()

  router.post('/login', async (req, res) => {
    const { email, password } = req.body

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email' })
    }

    // Authentication logic
    res.json({ success: true })
  })

  router.post('/logout', async (req, res) => {
    // Logout logic
    res.json({ success: true })
  })

  return router
}
