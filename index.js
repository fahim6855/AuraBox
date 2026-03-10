import { Hono } from "hono"; // read my  this
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { basicAuth } from "hono/basic-auth";
import Database from "better-sqlite3";
import { prettyJSON } from "hono/pretty-json";
import { createClient } from "@libsql/client";
let dbToken =
  "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzMxMTE1MDQsImlkIjoiMDE5Y2Q1YWUtMTIwMS03MTQ1LWE1MGEtOWRlNmQ0NTA4MjI4IiwicmlkIjoiMzE0YzNhNWYtMTRjNy00MGRhLWI0MzYtMWNjYzZjMmU3YmVmIn0.IhOQwb932E56GSFb3njizQDRebbbJamJyS-i1_axsVp5tlTIdv-4rgU5w0Jh_2HiXyrgbnGR-gG_jv9kzaV1CQ";

//Middlewares
const app = new Hono();
app.use("*", cors());
app.use("*", prettyJSON());
const db = createClient({
  url: "libsql://auraboxdb-fahim6855.aws-ap-south-1.turso.io",
  authToken: dbToken,
});

//insert Note to turso
app.post("/add", async (c) => {
  try {
    // 1. Get the JSON body
    const body = await c.req.json();

    // 2. Extract with defaults to avoid "null" constraint errors
    const title = body.title || "Untitled";
    const content = body.content || "dummy content";
    const user_id = Number(body.user_id) || 1;

    // 3. Execute with explicit arguments array
    await db.execute({
      sql: "INSERT INTO notes (title, content, user_id) VALUES (?, ?, ?)",
      args: [title, content, user_id],
    });

    return c.json({ success: true }, 201);
  } catch (err) {
    // This will print the EXACT error to your terminal
    console.error("Insert failed:", err.message);
    return c.json({ error: err.message }, 500);
  }
});
//Update Note
//delete Note by id
app.get("/delete/:id", async (c) => {
  const id = c.req.param("id");

  try {
    const result = await db.execute({
      sql: "DELETE FROM notes WHERE id = ?",
      args: [id],
    });

    // result.rowsAffected tells us if something was actually deleted
    if (result.rowsAffected === 0) {
      return c.json({ error: "Note not found" }, 404);
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

const usersDb = {
  fahim: { password: "123", name: "Fahim Ahmed" },
  karim: { password: "456", name: "Karim Ullah" },
};

// Protect only the /admin route
app.use(
  "/admin/*",
  basicAuth({
    // <--- You were missing this part!
    verifyUser: (username, password, c) => {
      const user = usersDb[username];

      if (user && user.password === password) {
        c.set("authUser", user.name);
        return true;
      }

      return false;
    },
  }) // <--- And this closing bracket/parenthesis
);

app.get("/admin/data", (c) => {
  const user = c.get("authUser");
  return c.json({
    message: `Welcome, ${user || "Guest"}! This is your profile.`,
  });
});
// 2. Routes

app.get("/user", (c) => {
  return c.json({
    name: "Fahim",
    country: "Bangladesh",
  });
});

app.get("/about/:name", (c) => {
  const name = c.req.param("name");
  return c.json({
    name: name.toUpperCase(),
  });
});

// 3. Start Server
const port = 3000;
console.log(` 🔥 Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
