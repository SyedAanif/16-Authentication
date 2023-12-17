// for getting access to environment variables, add it as early as possible in the file
// add ".env" file at the root of the project, with the variable-names (NAME=VALUE)
import "dotenv/config";

import bodyParser from "body-parser";
import express from "express";
import pg from "pg";

// used as a middle-ware for session-management
import session from "express-session";

// Passport is a Node authentication middleware
// that provides over 500 authentication strategies
// Session management- authenticated users to sessions of express-session
import passport from "passport";
// Authentication strategy
// https://medium.com/@prashantramnyc/node-js-with-passport-authentication-simplified-76ca65ee91e5 -- See this for more understanding
// import Strategy from "passport-local";

// Google OAuth2.0 Strategy for authentication adn authorization
import { Strategy as GooogleStrategy } from "passport-google-oauth20";

// Hashing function
// import md5 from "md5";

// newer and robust Hashing and Salting package
// import bcrypt from "bcrypt";

// number of times to salt the hash
// const SALT_ROUNDS = 10;

// const PORT = 3000;
const PORT = process.env.PORT;

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

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

// session middleware
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

// passport authentication middleware
app.use(passport.initialize()); // intialize on every route call
app.use(passport.session()); // allow passport to use express-session

// return the "authenticated user"
// passport.use(new Strategy(authUser));

// async function authUser(user, password, done) {
//   // done(err, auth_user) passed to serialize function
//   const result = await db.query("SELECT * FROM users WHERE email = $1", [user]);
//   if (result.rows.length == 0) {
//     return done(null, false);
//   }

//   if (password == result.rows[0]["password"]) {
//     // only logged in users can access secrets
//     return done(null, result.rows);
//   } else {
//     //error catching
//     return done(null, false);
//   }
// }

// Google Oauth 2.0 Strategy
passport.use(
  new GooogleStrategy(
    {
      clientID: process.env["CLIENT_ID"],
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      // console.log(accessToken);
      // console.log(refreshToken);
      // console.log(profile);
      // console.log(cb);

      // Create or Find User in our DB
      const account = profile._json;
      let user = {};
      try {
        const currentUserQuery = await db.query(
          "SELECT * FROM users WHERE google_id = $1",
          [account.sub]
        );
        // console.log(currentUserQuery.rows)

        // user not found, then create
        if (currentUserQuery.rows.length === 0) {
          // create user
          await db.query(
            "INSERT INTO users (username, google_id) VALUES ($1, $2)",
            [account.name, account.sub]
          );
          user = {
            username: account.name,
            id: account.sub,
          };
        } else {
          user = {
            username: currentUserQuery.rows[0].username,
            id: currentUserQuery.rows[0].google_id,
          };
        }
        done(null, user);
      } catch (error) {
        done(error);
      }
    }
  )
);

// attach the authenticated user to "req.session.passport.user.{..}"
// This allows the authenticated user to be "attached" to a unique session.
passport.serializeUser((user, done) => {
  // loads into req.session.passport.user
  done(null, user);
});

// retrieve the authenticated user object for that session
passport.deserializeUser((user, done) => {
  // loads into req.user
  done(null, user);
});

app.get("/", (req, res) => {
  // console.log(process.env.SECRET); // just for test
  res.render("home.ejs");
});

// Call for login with Google
// use passport to authenticate with Google Strategy to recognise our app from above
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

// Callback URL
app.get(
  "/auth/google/secrets",
  // Takes our callback, then passport decodes the "code" to be put in session
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");
  }
);

app.get("/login", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("secrets.ejs");
  } else {
    res.render("login.ejs");
  }
});

app.get("/register", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("secrets.ejs");
  } else {
    res.render("register.ejs");
  }
});

app.get("/secrets", async (req, res) => {
  // will prevent a user from pressing the back button and seeing the dashboard page after they logout.
  res.header(
    "Cache-Control",
    "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0"
  );
  if (req.isAuthenticated()) {
    const result = await db.query("SELECT * FROM secrets");

    res.render("secrets.ejs", {
      secrets: result.rows,
    });
  } else {
    res.redirect("/login");
  }
});

//  clear out cookies, session data
app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

// Register a new user
// app.post("/register", async (req, res) => {
//   const password = req.body["password"];
//   // Hash the password using MD5
//   // const passwordHash = md5(password);

//   try {
//     // ASYNC way to SALT and HASH
//     bcrypt.hash(password, SALT_ROUNDS, function (err, hashedPassword) {
//       // Store hash in your password DB.
//       db.query("INSERT INTO users (email, password) VALUES ($1, $2)", [
//         req.body["username"],
//         hashedPassword,
//       ]);
//     });

//     // only registered users can access secrets
//     res.render("secrets.ejs");
//   } catch (error) {
//     console.error("Error while registering user", error);
//   }
// });

// passport.authenticate() as middleware on your login route
app.post(
  "/register",
  passport.authenticate("local", {
    successRedirect: "/secrets",
    failureRedirect: "/register",
  })
);

// Login a registered user
// app.post("/login", async (req, res) => {
//   const password = req.body["password"];

//   //  MD5 Hash
//   // const passwordHash = md5(password);
//   try {
//     const result = await db.query("SELECT * FROM users where email = $1", [
//       req.body["username"],
//     ]);
//     if (result.rows.length) {
//       // Load hash from your password DB.
//       // Compare salt & hash password with plain-text password
//       bcrypt.compare(password, result.rows[0]["password"], function (err, matched) {
//           if (matched === true) {
//             // only logged in users can access secrets
//             res.render("secrets.ejs");
//           } else {
//             //error catching
//             res.redirect("/");
//           }
//         }
//       );
//     } else {
//       //error catching
//       res.redirect("/");
//     }
//   } catch (error) {
//     console.error("Error while login", error);
//   }
// });

// passport.authenticate() as middleware on your login route
app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/secrets",
    failureRedirect: "/login",
  })
);

// create a secret
app.get("/submit", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("submit.ejs");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", async (req, res) => {
  const secret = req.body["secret"];
  // // find authenticated user
  // const authenticatedUser = req.user["id"];

  // Persist Secret
  try {
    await db.query("INSERT INTO secrets (body) VALUES ($1)", [secret]);
    res.redirect("/secrets");
  } catch (error) {
    console.error("Error occurred while persisting secret", error);
  }
});

app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});
