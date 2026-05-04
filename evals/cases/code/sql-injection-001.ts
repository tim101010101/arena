import type { Case } from "../../runner/schema";

const code = `import express from "express";
import { db } from "./db";

const app = express();

app.get("/user", (req, res) => {
  const id = req.query.id;
  const result = db.query(\`SELECT * FROM users WHERE id = \${id}\`);
  res.json(result);
});

app.post("/search", (req, res) => {
  const term = req.body.term;
  const sql = "SELECT * FROM items WHERE name LIKE '%" + term + "%'";
  res.json(db.query(sql));
});
`;

const c: Case = {
  id: "code-sql-injection-001",
  kind: "review",
  description: "Two endpoints concatenate user input directly into SQL queries.",
  sources: [{ type: "raw", code }],
  focus: ["security", "bugs"],
  rounds: 2,
  tags: ["code", "security", "smoke"],
  expectations: [
    {
      id: "identifies-injection-get",
      question:
        "Does the transcript clearly identify that the GET /user endpoint allows SQL injection because req.query.id is interpolated into a raw SQL string?",
      required: true,
    },
    {
      id: "identifies-injection-post",
      question:
        "Does the transcript clearly identify that the POST /search endpoint allows SQL injection through the body.term concatenation?",
      required: true,
    },
    {
      id: "proposes-parameterization",
      question:
        "Does at least one fighter explicitly propose parameterized queries, prepared statements, or an ORM query builder as the fix?",
      required: true,
    },
    {
      id: "mentions-attack-vector",
      question:
        "Does any fighter name a concrete attack payload or class of attack (e.g. UNION-based, dropping tables, exfiltrating rows) — not just abstract 'an attacker could'?",
      required: false,
    },
  ],
  rubric: [
    {
      dim: "concreteness",
      description:
        "Cites specific lines, query strings, attack payloads, or fix snippets. 5 = quotes the vulnerable line and shows the safe replacement; 1 = generic 'sanitize input' advice.",
      min: 3,
    },
    {
      dim: "opposition_clash",
      description:
        "Round 2 explicitly engages with Round 1 opposing arguments. 5 = directly quotes/references the opponent and pushes back; 1 = parallel monologue.",
      min: 3,
    },
  ],
  budget: { max_latency_ms: 420_000, max_rounds_with_errors: 1 },
  timeout_ms: 180_000,
};

export default c;
