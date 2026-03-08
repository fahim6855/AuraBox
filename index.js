import { Hono } from "hono";
import { serve } from "@hono/node-server";

const app = new Hono();

app.get("/", (c) => {
  return c.text("Hello Fahim 3.2.0 👋");
});

app.get("/user", (c) => {
  return c.json({
    name: "Fahim",
    country: "Bangladesh",
  });
});

app.get("/about:id", (c) => {
  const id = c.req.param("id");
  return c.text(`This is about page and id is :${id})`);
});

serve({
  fetch: app.fetch,
  port: 3000,
});
