// for getting access to environment variables, add it as early as possible in the file
// add ".env" file at the root of the project, with the variable-names (NAME=VALUE)
import "dotenv/config";

import bodyParser from "body-parser";
import express from "express";
import pg from "pg";

// Hashing function
import md5 from "md5";

// const PORT = 3000;
const PORT = process.env.PORT;

const app = express();

// const db = new pg.Client({
//   host: "localhost",
//   port: 5432,
//   user: "postgres",
//   password: "password",
//   database: "userDB",
// });

// access ENV variables
const db = new pg.Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  console.log(process.env.SECRET); // just for test
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
  const password = req.body["password"];
  // Hash the password 
  const passwordHash = md5(password);
  try {
    await db.query("INSERT INTO users (email, password) VALUES ($1, $2)", [
      req.body["username"],
      passwordHash,
    ]);
    // only registered users can access secrets
    res.render("secrets.ejs");
  } catch (error) {
    console.error("Error while registering user", error);
  }
});

// Login a registered user
app.post("/login", async (req, res) => {
  const password = req.body["password"];
  const passwordHash = md5(password);
  try {
    const result = await db.query(
      "SELECT * FROM users where email = $1 AND password = $2",
      [req.body["username"], passwordHash]
    );
    if (result.rows.length) {
      // only logged in users can access secrets
      res.render("secrets.ejs");
    } else {
      //error catching
      res.redirect("/");
    }
  } catch (error) {
    console.error("Error while login", error);
  }
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
