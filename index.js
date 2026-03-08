import { Hono } from "hono";
import { serve } from "@hono/node-server";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Fahim 4.2.0 👋");
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
      name: name.toUpperCase()
  });
});

serve({
  fetch: app.fetch,
  port: 3000,
});
