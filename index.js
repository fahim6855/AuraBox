import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { basicAuth } from "hono/basic-auth";
import Database from "better-sqlite3";

const app = new Hono();
app.use("*", cors());

const db = new Database("data.db");

// Create the table with a proper 'content' column
db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT
  )
`);

// Seed data: Add a row ONLY if the table is empty
const rowCount = db.prepare("SELECT count(*) as count FROM notes").get();
if (rowCount.count === 0) {
  db.prepare("INSERT INTO notes (content) VALUES (?)").run("First Seeded Item");
  console.log("✅ Seeded initial data into 'notes' table");
}

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
app.get("/", (c) => {
  return c.text("Hello Fahim 5.2.0 👋");
});

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
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
