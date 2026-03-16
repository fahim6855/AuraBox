import dotenv from "dotenv";
dotenv.config(); // loads .env
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { basicAuth } from "hono/basic-auth";
import Database from "better-sqlite3";
import { prettyJSON } from "hono/pretty-json";
import { createClient } from "@libsql/client";
import bcrypt from "bcrypt";
import { jwt, sign, verify } from "hono/jwt";
import { z } from "zod";

let dbToken = process.env.TURSO_DB_TOKEN;

//Middlewares
const app = new Hono(); //just a change
app.use("*", cors());
app.use("*", prettyJSON());
const db = createClient({
  url: "libsql://auraboxdb-fahim6855.aws-ap-south-1.turso.io",
  authToken: dbToken,
});
const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const authMiddleware = async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = await verify(
      token,
      process.env.JWT_SECRET || "your-secret",
      "HS256"
    );
    c.set("user", payload); // attach user info to context
    await next();
  } catch (err) {
    console.error("JWT verify failed:", err.message); // add this
    return c.json({ error: "Invalid or expired token" }, 401);
  }
};
//loginUser

app.post("/login", async (c) => {
  const { email, password } = await c.req.json();

  // Find user in database
  const result = await db.execute({
    sql: "SELECT * FROM users WHERE email = ?",
    args: [email],
  });

  const user = result.rows[0];
  if (!user) return c.json({ error: "Invalid credentials" }, 401);

  // Check password with
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return c.json({ error: "Invalid credentials" }, 401);

  // Generate token
  const token = await sign(
    {
      sub: user.id,
      email: user.email,
      exp: Math.floor(Date.now() / 1000) + 86400,
    },
    process.env.JWT_SECRET || "your-secret",
    "HS256"
  );

  // console.log(user, valid, token);
  return c.json({ token });
});

// get info with token
app.get(
  "/me",
  jwt({ secret: process.env.JWT_SECRET || "your-secret", alg: "HS256" }),
  async (c) => {
    const payload = c.get("jwtPayload"); // decoded token data to save

    const result = await db.execute({
      sql: "SELECT id, name, email FROM users WHERE id = ?",
      args: [payload.sub], // sub is the user id we stored during login
    });

    return c.json(result.rows[0]);
  }
);

//sign up
app.post("/signup", async (c) => {
  const body = await c.req.json();
  const result = signupSchema.safeParse(body);
  if (!result.success) {
    return c.json({ error: result.error.issues[0].message }, 400);
  }

  // ✅ get data from result.data, not db.execute
  const { name, email, password } = result.data;

  // ✅ now password is defined
  const hashedPassword = await bcrypt.hash(password, 10);

  const dbResult = await db.execute({
    sql: "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
    args: [name, email, hashedPassword],
  });

  return c.json(
    { message: "User created", userId: dbResult.lastInsertRowid },
    201
  );
});

//insert Note to turso
app.post("/add", authMiddleware, async (c) => {
  try {
    const body = await c.req.json();

    // Get user_id from the JWT payload — not from the request body
    const user = c.get("user");
    const user_id = user.sub; // this is what you set in login: sub: user.id

    const title = body.title || "Untitled";
    const content = body.content || "dummy content";

    await db.execute({
      sql: "INSERT INTO notes (title, content, user_id) VALUES (?, ?, ?)",
      args: [title, content, user_id],
    });

    return c.json({ success: true }, 201);
  } catch (err) {
    console.error("Insert failed:", err.message);
    return c.json({ error: err.message }, 500);
  }
});

//Update Note
app.post("/edit/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  const user_id = user.sub;

  const body = await c.req.json();
  const { title, content } = body;

  try {
    const result = await db.execute({
      sql: "UPDATE notes SET title = ?, content = ? WHERE id = ? AND user_id = ?",
      args: [title, content, id, user_id],
    });

    if (result.rowsAffected === 0) {
      return c.json({ error: "Note not found or not yours" }, 404);
    }

    return c.json({ message: "Note updated successfully" }, 200);
  } catch (e) {
    console.error("Update Error:", e.message);
    return c.json({ error: "Failed to update note: " + e.message }, 500);
  }
});

//delete Note by id
app.delete("/delete/:id", authMiddleware, async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  const user_id = user.sub;

  try {
    const result = await db.execute({
      sql: "DELETE FROM notes WHERE id = ? AND user_id = ?",
      args: [id, user_id],
    });

    // result.rowsAffected tells us if something was actually deleted
    if (result.rowsAffected === 0) {
      return c.json({ error: "Note not found or not yours" }, 404);
    }

    return c.json({ success: true, message: `Note ${id} deleted` });
  } catch (e) {
    console.error("Delete Error:", e.message);
    return c.json({ error: "Failed to delete note: " + e.message }, 500);
  }
});
// Select Note by Id
app.get("/", async (c) => {
  const note = (await db.execute("Select * from notes")).rows;
  if (!note) {
    return c.text("Note not found.Please Enter correct id number");
  }
  return c.json(note);
});

// 3. Start Server
const port = 3001;
console.log(` 🔥 Server is running on http://localhost:${port} 🔥`);

serve({
  fetch: app.fetch,
  port,
});

export default app; //port
