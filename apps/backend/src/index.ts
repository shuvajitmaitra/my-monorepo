import express, { Request, Response } from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

const users = [
  { id: 1, name: "Alice", email: "alice@example.com", createdAt: "2025-01-01T00:00:00.000Z" },
  { id: 2, name: "Bob", email: "bob@example.com", createdAt: "2025-03-15T00:00:00.000Z" },
  { id: 3, name: "Charlie", email: "charlie@example.com", createdAt: "2025-06-20T00:00:00.000Z" },
];

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/users", (_req: Request, res: Response) => {
  res.json({ data: users });
});

app.get("/api/users/:id", (req: Request, res: Response) => {
  const user = users.find((u) => u.id === Number(req.params.id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ data: user });
});

app.post("/api/users", (req: Request, res: Response) => {
  const { name, email } = req.body as { name: string; email: string };
  if (!name || !email) {
    res.status(400).json({ error: "name and email are required" });
    return;
  }
  const newUser = { id: users.length + 1, name, email, createdAt: new Date().toISOString() };
  users.push(newUser);
  res.status(201).json({ data: newUser });
});

app.delete("/api/users/:id", (req: Request, res: Response) => {
  const index = users.findIndex((u) => u.id === Number(req.params.id));
  if (index === -1) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const [deleted] = users.splice(index, 1);
  res.json({ data: deleted });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
