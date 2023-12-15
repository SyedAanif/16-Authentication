import bodyParser from "body-parser";
import express from "express";
import pg from "pg";

const PORT = 3000;

const app = express();

const db = new pg.Client({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "password",
  database: "userDB",
});

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("home.ejs");
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

// Register a new user
app.post("/register", async (req, res) => {
  try {
    await db.query("INSERT INTO users (email, password) VALUES ($1, $2)", [
      req.body["username"],
      req.body["password"],
    ]);
    // only registered users can access secrets
    res.render("secrets.ejs");
  } catch (error) {
    console.error("Error while registering user", error);
  }
});

// Login a registered user
app.post("/login", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM users where email = $1 AND password = $2",
      [req.body["username"], req.body["password"]]
    );
    if (result.rows.length) {
      // only logged in users can access secrets
      res.render("secrets.ejs");
    }
    //error catching
    res.redirect("/");
  } catch (error) {
    console.error("Error while login", error);
  }
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
