const REQUIRED_ALWAYS = ["MONGO_URI", "JWT_SECRET", "JWT_REFRESH_SECRET", "SESSION_SECRET"];
const REQUIRED_PRODUCTION = ["CLIENT_URL", "ADMIN_EMAILS", "ADMIN_PRIVATE_KEY"];

function validateEnvironment(env = process.env) {
  const required = [...REQUIRED_ALWAYS];
  if (env.NODE_ENV === "production") required.push(...REQUIRED_PRODUCTION);

  const missing = required.filter((name) => !String(env[name] || "").trim());
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  if (env.NODE_ENV === "production" && env.CLIENT_URL && !/^https:\/\//i.test(env.CLIENT_URL)) {
    throw new Error("CLIENT_URL must use HTTPS in production");
  }

  return true;
}

module.exports = { validateEnvironment, REQUIRED_ALWAYS, REQUIRED_PRODUCTION };
