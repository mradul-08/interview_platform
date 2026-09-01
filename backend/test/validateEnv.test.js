const test = require("node:test");
const assert = require("node:assert/strict");
const { validateEnvironment } = require("../config/validateEnv");

const validBase = {
  MONGO_URI: "mongodb://localhost/codeverse",
  JWT_SECRET: "access-secret",
  JWT_REFRESH_SECRET: "refresh-secret",
  SESSION_SECRET: "session-secret",
};

test("accepts the required development environment", () => {
  assert.equal(validateEnvironment({ ...validBase, NODE_ENV: "development" }), true);
});

test("rejects production without deployment secrets", () => {
  assert.throws(
    () => validateEnvironment({ ...validBase, NODE_ENV: "production" }),
    /CLIENT_URL, ADMIN_EMAILS, ADMIN_PRIVATE_KEY/
  );
});

test("requires HTTPS for the production client URL", () => {
  assert.throws(
    () => validateEnvironment({ ...validBase, NODE_ENV: "production", CLIENT_URL: "http://app.example.com", ADMIN_EMAILS: "admin@example.com", ADMIN_PRIVATE_KEY: "private-key" }),
    /CLIENT_URL must use HTTPS/
  );
});

test("accepts a complete production environment", () => {
  assert.equal(validateEnvironment({ ...validBase, NODE_ENV: "production", CLIENT_URL: "https://app.example.com", ADMIN_EMAILS: "admin@example.com", ADMIN_PRIVATE_KEY: "private-key" }), true);
});
