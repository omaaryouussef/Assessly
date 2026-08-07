import { Router } from 'express'

import {
  loginUser,
  getUser,
  createUser,
  googleCallback,
  completeGoogleProfile,
  verifyEmail,
  getInviteByToken,
  acceptInvite,
  forgotPassword,
  verifyPasswordResetCode,
  resetPassword,
} from '../handlers/userHandlers.js'
import { authenticate } from '../middleware/authenticate.js'
import passport from '../auth/googleStrategy.js'

const usersRouter = Router()

usersRouter.post('/register', createUser)
usersRouter.post('/login', loginUser)
usersRouter.post('/verify-email', verifyEmail)
usersRouter.get('/invite', getInviteByToken)
usersRouter.post('/accept-invite', acceptInvite)
usersRouter.get('/user', authenticate, getUser)
usersRouter.post('/forgot-password', forgotPassword)
usersRouter.post('/verify-password-reset-code', verifyPasswordResetCode)
usersRouter.post('/reset-password', resetPassword)
usersRouter.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
)
usersRouter.get(
  '/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=google_auth_failed`,
  }),
  googleCallback
)
usersRouter.post('/google/complete-profile', completeGoogleProfile)
// usersRouter.get("/:auc_Id", getUserById);

export default usersRouter
