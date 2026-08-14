const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

const ALLOWED_ROLES = ["student", "company"];

function providerFallbackEmail(provider, uniqueId, username) {
    const safeId = String(uniqueId || "").trim();
    const safeUsername = String(username || "").trim();
    return `${safeUsername || safeId || provider}@${provider}-oauth.local`;
}

// Role is stored in a cookie before OAuth redirect (set in authRoutes)
function getRoleFromReq(req) {
    const fromCookie = req.cookies && req.cookies["oauth_role"];
    return ALLOWED_ROLES.includes(fromCookie) ? fromCookie : "student";
}

function registerStrategy(name, StrategyCtor, options, verify) {
    const missing = Object.entries(options)
        .filter(([, value]) => !value)
        .map(([key]) => key);
    if (missing.length > 0) {
        if (process.env.NODE_ENV !== "production") {
            console.warn(`[passport] Skipping ${name} strategy, missing env: ${missing.join(", ")}`);
        }
        return;
    }
    passport.use(name, new StrategyCtor(options, verify));
}

// ===== Google =====
registerStrategy(
    "google",
    GoogleStrategy,
    {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
        try {
            let user = await User.findOne({ googleId: profile.id });
            if (user) return done(null, user);

            const email = profile.emails?.[0]?.value || providerFallbackEmail("google", profile.id, profile.displayName);
            const existing = await User.findOne({ email });
            if (existing) {
                existing.googleId = profile.id;
                existing.authProvider = "google";
                existing.emailVerified = true;
                await existing.save();
                return done(null, existing);
            }

            const newUser = await User.create({
                name: profile.displayName,
                email,
                googleId: profile.id,
                authProvider: "google",
                emailVerified: true,
                role: getRoleFromReq(req),
                // Do not write username: null. The username is optional and
                // can be completed later from the profile page.
            });
            return done(null, newUser);
        } catch (err) {
            return done(err, null);
        }
    }
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        done(null, await User.findById(id));
    } catch (err) {
        done(err, null);
    }
});

module.exports = passport;
