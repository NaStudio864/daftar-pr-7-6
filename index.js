import jwt from "jsonwebtoken";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { action } = req.query;

  // LOGIN PIN 4 ANGKA
  if (action === "login") {
    const { username, pin } = req.body;

    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("pin", pin)
      .single();

    if (!data) return res.status(401).json({ error: "Login gagal" });

    if (!data.approved) return res.status(403).json({ error: "Belum disetujui admin" });

    const token = jwt.sign(
      { id: data.id, role: data.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({ token });
  }

  // AI HELPER (GEMINI)
  if (action === "ai") {
    const { prompt } = req.body;

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const j = await r.json();
    return res.json({ reply: j.candidates?.[0]?.content?.parts?.[0]?.text });
  }

  // STATISTIK
  if (action === "stats") {
    const users = await supabase.from("users").select("*", { count: "exact" });
    const pr = await supabase.from("pr").select("*", { count: "exact" });

    return res.json({
      users: users.count,
      pr: pr.count
    });
  }

  res.status(404).end();
}