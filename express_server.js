const express = require("express");
const app = express();
const PORT = 8080; // default port 8080

const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.set("view engine", "ejs");

const urlDatabase = {
  "b2xVn2": {
    longURL: "http://www.lighthouselabs.ca",
    uid: "userRandomID"
  },
  "9sm5xK": {
    longURL: "http://www.google.com",
    uid: "user2RandomID"
  }
};

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "testing-"
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "testing-"
  }
};

/**
 * nodemon is resetting urls data during development, 
 * and it is efficient to have an endpoint which can give us what our users object contains
 * TODO: remove this endpoint in production.
 */
app.get("/urls-dev", (req, res) => {
  res.send(JSON.stringify(urlDatabase));
});

function generateRandomString() {
  const chars = "1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const len = chars.length;
  let output = "";
  for (let j = 0; j < 6; j++) {
    const randomIndex = Math.floor(Math.random() * len);
    output += chars[randomIndex];
  }
  return output;
}

function findUserByEmail(email) {
  for (const uid in users) {
    if (users[uid].email === email) {
      return users[uid];
    }
  }
}

function urlsForUser(uid) {
  const output = {};
  for (const shortURL in urlDatabase) {
    if (urlDatabase[shortURL].uid === uid) {
      output[shortURL] = urlDatabase[shortURL];
    }
  }
  return output;
}


app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/urls", (req, res) => {
  const user_id = req.cookies.user_id;
  // console.log("users:", users);
  // console.log("user_id:", user_id);
  // console.log("user:", users[user_id]);
  /**
   * a cookie is being set when user registers, 
   * but nodemon restarts the server whenever a change is saved to this file, 
   * and so the users object reverts to the initial value and user_id is not found in users
   * and so the html templates (_header partial) receives an undefined user
   */
  if (!user_id) {
    return res.status(404).render("404", {
      user: undefined,
      message: "login required for viewing urls"
    });
  }
  const userURLs = urlsForUser(user_id);
  const templateVars = {
    user: users[user_id],
    urls: userURLs
  };
  res.render("urls_index", templateVars);
});


app.post("/urls", (req, res) => {
  const user_id = req.cookies.user_id;
  const user = users[user_id];
  if (!user) {
    return res.redirect("/login");
  }
  const longURL = req.body.longURL;
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = {
    longURL,
    uid: user_id
  };
  console.log(urlDatabase);
  res.redirect(`http://localhost:${PORT}/urls/${shortURL}`);
});

app.get("/urls/new", (req, res) => {
  const user_id = req.cookies.user_id;
  const user = users[user_id];
  if (!user_id) {
    return res.redirect("/login");
  }
  res.render("urls_new", { user });
});

app.get("/urls/:shortURL", (req, res) => {
  const user_id = req.cookies.user_id;
  const user = users[user_id];

  if (!user_id) {
    return res.status(404).render("404", {
      user: undefined,
      message: "login is required for Editing urls"
    });
  }
  const userURLs = urlsForUser(user_id);
  const shortURL = req.params.shortURL;
  if (!(shortURL in userURLs)) {
    res.status(404).render("404", {
      user,
      message: "You can only edit your own URLs"
    });
  }
  const templateVars = {
    user,
    shortURL,
    longURL: userURLs[shortURL].longURL,
  };

  res.render("urls_show", templateVars);
});

app.get("/u/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  const user = users[req.cookies.user_id];
  if (!(shortURL in urlDatabase)) {
    return res.status(404).render("404", {
      user,
      message: `shortURL ${shortURL} not found`
    });
  }
  const longURL = urlDatabase[shortURL].longURL;
  res.redirect(longURL);
});

app.post("/urls/:shortURL/delete", (req, res) => {
  const shortURL = req.params.shortURL;
  const uid = req.cookies.user_id;
  const userURLs = urlsForUser(uid);
  if (!(shortURL in userURLs)) {
    return res.status(404).render("404", {
      message: "Deletion of another user's url is not allowed"
    })
  }
  delete urlDatabase[shortURL];
  res.redirect("/urls");
});

app.post("/urls/:id", (req, res) => {
  const shortURL = req.params.id;
  const uid = req.cookies.user_id;
  const userURLs = urlsForUser(uid);
  if (!(shortURL in userURLs)) {
    return res.status(404).render("404", {
      message: "Editing another user's url is not allowed"
    })
  }
  urlDatabase[shortURL] = {
    longURL: req.body.longURL,
    uid
  };
  res.redirect("/urls");
});

app.get("/register", (req, res) => {
  const uid = req.cookies.user_id;
  const user = users[uid];
  res.render("user_registration", { user });
});

app.post("/register", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (email === "" || password === "") {
    res.status(400).send("Bad Request: email and password cannot be empty");
    return;
  }

  if (findUserByEmail(email)) {
    res.status(400).send("Bad Request: email already exists");
    return;
  }

  const id = generateRandomString();
  users[id] = { id, email, password };
  console.log(users);
  res.cookie("user_id", id).redirect("/urls");
});

app.get("/login", (req, res) => {
  const uid = req.cookies.user_id;
  const user = users[uid];
  res.render("login_form", { user });
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = findUserByEmail(email);
  if (!user) {
    return res.send("Error while signing in: user does not exist")
  }
  if (user.password !== password) {
    return res.send("Error while signing in: password does not match")
  }

  res.cookie("user_id", user.id).redirect("/urls");
});

app.post("/logout", (req, res) => {
  res.clearCookie("user_id").redirect("/urls");
});




app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.send("<html><body>Hello <b>World</b></body></html>\n");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});