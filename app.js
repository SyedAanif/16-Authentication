// for getting access to environment variables, add it as early as possible in the file
// add ".env" file at the root of the project, with the variable-names (NAME=VALUE)
import "dotenv/config";

import bodyParser from "body-parser";
import express from "express";
import pg from "pg";

// Hashing function
// import md5 from "md5";

// newer and robust Hashing and Salting package
import bcrypt from "bcrypt";

// number of times to salt the hash
const SALT_ROUNDS = 10;

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
  // Hash the password using MD5
  // const passwordHash = md5(password);

  try {
    // ASYNC way to SALT and HASH
    bcrypt.hash(password, SALT_ROUNDS, function (err, hashedPassword) {
      // Store hash in your password DB.
      db.query("INSERT INTO users (email, password) VALUES ($1, $2)", [
        req.body["username"],
        hashedPassword,
      ]);
    });

    // only registered users can access secrets
    res.render("secrets.ejs");
  } catch (error) {
    console.error("Error while registering user", error);
  }
});

// Login a registered user
app.post("/login", async (req, res) => {
  const password = req.body["password"];

  //  MD5 Hash
  // const passwordHash = md5(password);
  try {
    const result = await db.query("SELECT * FROM users where email = $1", [
      req.body["username"],
    ]);
    if (result.rows.length) {
      // Load hash from your password DB.
      // Compare salt & hash password with plain-text password
      bcrypt.compare(password, result.rows[0]["password"], function (err, matched) {
          if (matched === true) {
            // only logged in users can access secrets
            res.render("secrets.ejs");
          } else {
            //error catching
            res.redirect("/");
          }
        }
      );
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
