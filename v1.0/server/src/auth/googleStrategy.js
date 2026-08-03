import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth2'
import db from '../../db/index.js'

const DEFAULT_CALLBACK_URL =
  'http://localhost:3011/api/users/auth/google/callback'

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || DEFAULT_CALLBACK_URL,
    },
    async function (accessToken, refreshToken, profile, done) {
      try {
        const google_id = profile.id
        const email = profile.emails?.[0]?.value
        const name = profile.displayName || ''

        if (!email) {
          return done(new Error('Google account has no email'), null)
        }

        if (!google_id) {
          return done(new Error('Google account has no id'), null)
        }

        // Existing Google-linked account
        const byGoogleId = await db.query(
          'SELECT * FROM users WHERE google_id = $1',
          [google_id]
        )
        if (byGoogleId.rows.length > 0) {
          return done(null, byGoogleId.rows[0])
        }

        // Existing local account with same email — link Google id
        const byEmail = await db.query(
          'SELECT * FROM users WHERE email = $1',
          [email]
        )
        if (byEmail.rows.length > 0) {
          const localUser = byEmail.rows[0]

          if (localUser.google_id && localUser.google_id !== google_id) {
            return done(
              new Error(
                'This email is already linked to a different Google account'
              ),
              null
            )
          }

          if (!localUser.google_id) {
            const linked = await db.query(
              'UPDATE users SET google_id = $1 WHERE email = $2 RETURNING *',
              [google_id, email]
            )
            return done(null, linked.rows[0])
          }

          return done(null, localUser)
        }

        // Brand new — pending complete-profile (do not INSERT here)
        return done(null, {
          isNew: true,
          google_id,
          email,
          name,
        })
      } catch (err) {
        return done(err, null)
      }
    }
  )
)

passport.serializeUser((payload, done) => {
  done(null, payload)
})

passport.deserializeUser((payload, done) => {
  done(null, payload)
})

export default passport
