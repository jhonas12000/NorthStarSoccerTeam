import bcrypt from "bcrypt";
import { createHash, randomBytes } from "node:crypto";
import { Router } from "express";
import { getDatabase } from "../database.js";

const router = Router();
const cookieName = "northstar_session";
const dummyPasswordHash = "$2b$12$Ff2OwO3rBlF.neMmG/0wqenReqO6Uf4tHKS/nTB/uplzdMedqpLhC";
const loginAttempts = new Map();
const privateAccessRoles = new Set(["admin", "head_coach", "chairman", "finance"]);

function publicUser(user) {
  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role === "members" ? "user" : user.role,
  };
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function cookiesFrom(request) {
  return Object.fromEntries(
    (request.headers.cookie || "")
      .split(";")
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const separator = cookie.indexOf("=");
        return separator === -1
          ? [cookie, ""]
          : [cookie.slice(0, separator), decodeURIComponent(cookie.slice(separator + 1))];
      }),
  );
}

function setSessionCookie(response, token, remember) {
  const parts = [
    `${cookieName}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
  ];

  if (process.env.NODE_ENV === "production") parts.push("Secure");
  if (remember) parts.push(`Max-Age=${30 * 24 * 60 * 60}`);
  response.setHeader("Set-Cookie", parts.join("; "));
}

function clearSessionCookie(response) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.setHeader(
    "Set-Cookie",
    `${cookieName}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`,
  );
}

function rateLimitKey(request, email) {
  return `${request.ip}:${email}`;
}

function isRateLimited(key) {
  const now = Date.now();
  const record = loginAttempts.get(key);
  if (!record || record.resetAt <= now) {
    loginAttempts.delete(key);
    return false;
  }
  return record.count >= 5;
}

function recordFailedLogin(key) {
  const now = Date.now();
  const record = loginAttempts.get(key);
  loginAttempts.set(key, {
    count: record && record.resetAt > now ? record.count + 1 : 1,
    resetAt: record && record.resetAt > now ? record.resetAt : now + 15 * 60 * 1000,
  });
}

async function sessionUser(request) {
  const token = cookiesFrom(request)[cookieName];
  if (!token) return null;

  const database = await getDatabase();
  const session = await database.collection("sessions").findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;

  const user = await database.collection("users").findOne({
    _id: session.userId,
    isActive: true,
  });
  return user ? { user, session } : null;
}

export async function requireAuthentication(request, response, next) {
  try {
    const authenticated = await sessionUser(request);
    if (!authenticated) {
      return response.status(401).json({ error: "Authentication required." });
    }

    request.authenticatedUser = authenticated.user;
    next();
  } catch (error) {
    console.error("Unable to verify session:", error);
    response.status(503).json({ error: "Authentication is temporarily unavailable." });
  }
}

export async function requireAdmin(request, response, next) {
  try {
    const authenticated = await sessionUser(request);
    if (!authenticated) {
      return response.status(401).json({ error: "Authentication required." });
    }
    if (authenticated.user.role !== "admin") {
      return response.status(403).json({ error: "Administrator access required." });
    }

    request.authenticatedUser = authenticated.user;
    next();
  } catch (error) {
    console.error("Unable to verify administrator session:", error);
    response.status(503).json({ error: "Authentication is temporarily unavailable." });
  }
}

export async function requirePrivateAccess(request, response, next) {
  try {
    const authenticated = await sessionUser(request);
    if (!authenticated) {
      return response.status(401).json({ error: "Authentication required." });
    }
    if (!privateAccessRoles.has(authenticated.user.role)) {
      return response.status(403).json({ error: "Your account does not have access to this area." });
    }

    request.authenticatedUser = authenticated.user;
    next();
  } catch (error) {
    console.error("Unable to verify private access:", error);
    response.status(503).json({ error: "Authentication is temporarily unavailable." });
  }
}

router.post("/login", async (request, response) => {
  const email = typeof request.body?.email === "string" ? request.body.email.trim().toLowerCase() : "";
  const password = typeof request.body?.password === "string" ? request.body.password : "";
  const remember = request.body?.remember === true;

  if (!/^\S+@\S+\.\S+$/.test(email) || !password) {
    return response.status(400).json({ error: "Email and password are required." });
  }

  const key = rateLimitKey(request, email);
  if (isRateLimited(key)) {
    return response.status(429).json({ error: "Too many sign-in attempts. Try again in 15 minutes." });
  }

  try {
    const database = await getDatabase();
    const user = await database.collection("users").findOne({ email });
    const passwordMatches = await bcrypt.compare(password, user?.passwordHash || dummyPasswordHash);

    if (!user || !passwordMatches || user.isActive !== true) {
      recordFailedLogin(key);
      return response.status(401).json({ error: "Incorrect email or password." });
    }

    loginAttempts.delete(key);
    const token = randomBytes(32).toString("base64url");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (remember ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000));
    const sessions = database.collection("sessions");

    await sessions.createIndex({ tokenHash: 1 }, { unique: true });
    await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await sessions.insertOne({
      tokenHash: hashToken(token),
      userId: user._id,
      createdAt: now,
      expiresAt,
    });
    await database.collection("users").updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: now } },
    );

    setSessionCookie(response, token, remember);
    response.json({ user: publicUser(user) });
  } catch (error) {
    console.error("Unable to sign in:", error);
    response.status(503).json({ error: "Sign-in is temporarily unavailable." });
  }
});

router.get("/me", requireAuthentication, (request, response) => {
  response.json({ user: publicUser(request.authenticatedUser) });
});

router.post("/logout", async (request, response) => {
  try {
    const token = cookiesFrom(request)[cookieName];
    if (token) {
      const database = await getDatabase();
      await database.collection("sessions").deleteOne({ tokenHash: hashToken(token) });
    }
  } catch (error) {
    console.error("Unable to remove session:", error);
  }

  clearSessionCookie(response);
  response.status(204).end();
});

export default router;
