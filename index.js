import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { basicAuth } from "hono/basic-auth";
import Database from "better-sqlite3";
import { prettyJSON } from "hono/pretty-json";

//Middlewares
const app = new Hono();
app.use("*", cors());
app.use("*", prettyJSON());
const db = new Database("data.db");

//insert Note
//db.prepare("Insert into notes (content) VALUES ('6th seeds inserted')").run();
//Update Note
//db.prepare("UPDATE Notes SET title = 'title 1' WHERE id = ?").run(1);
//delete Note
//db.prepare("DELETE from notes WHERE id = ?").run(6);

// Select Note by Id
const note = db.prepare("Select * from notes").all();

app.get("/", (c) => {
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
