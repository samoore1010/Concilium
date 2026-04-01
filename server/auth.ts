import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "./db.js";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production");
  }
  return secret || "concilium-dev-secret-change-in-production";
}

const JWT_SECRET = getJwtSecret();
const TOKEN_EXPIRY = "7d";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// JWT middleware — attaches user to request if valid token present
export function authMiddleware(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next();
    return;
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = { id: payload.id, email: payload.email, name: payload.name };
  } catch {
    // Invalid token — continue without user
  }
  next();
}

// Require authentication — returns 401 if no user
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

function signToken(user: AuthUser): string {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRY,
  });
}

export const authRouter = Router();

// POST /api/auth/signup
authRouter.post("/signup", async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    res.status(400).json({ error: "email, password, and name are required" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  try {
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    db.prepare("INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)").run(
      id, email.toLowerCase().trim(), name.trim(), passwordHash
    );

    const user: AuthUser = { id, email: email.toLowerCase().trim(), name: name.trim() };
    const token = signToken(user);

    console.log(`[Auth] New user: ${email}`);
    res.status(201).json({ user, token });
  } catch (err: any) {
    console.error("[Auth] Signup error:", err.message);
    res.status(500).json({ error: "Failed to create account" });
  }
});

// POST /api/auth/login
authRouter.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const db = getDb();
  const row = db.prepare("SELECT id, email, name, password_hash FROM users WHERE email = ?").get(
    email.toLowerCase().trim()
  ) as { id: string; email: string; name: string; password_hash: string } | undefined;

  if (!row) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const user: AuthUser = { id: row.id, email: row.email, name: row.name };
  const token = signToken(user);

  console.log(`[Auth] Login: ${email}`);
  res.json({ user, token });
});

// GET /api/auth/me — returns current user from token
authRouter.get("/me", (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({ user: req.user });
});
