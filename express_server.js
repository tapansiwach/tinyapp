const express = require("express");
const app = express();
const PORT = 8080; // default port 8080

const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.set("view engine", "ejs");

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
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

  const templateVars = {
    user: users[user_id],
    urls: urlDatabase
  };
  res.render("urls_index", templateVars);
});


app.post("/urls", (req, res) => {
  const longURL = req.body.longURL;
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = longURL;
  console.log(urlDatabase);
  res.redirect(`http://localhost:${PORT}/urls/${shortURL}`);
});

app.get("/urls/new", (req, res) => {
  const user_id = req.cookies.user_id;

  const templateVars = {
    user: users[user_id]
  };
  res.render("urls_new", templateVars);
});

app.get("/urls/:shortURL", (req, res) => {
  const user_id = req.cookies.user_id;

  const templateVars = {
    user: users[user_id],
    shortURL: req.params.shortURL,
    longURL: urlDatabase[req.params.shortURL]
  };
  if (templateVars.longURL) {
    res.render("urls_show", templateVars);
  } else {
    res.statusCode = 404;
    res.send("404 Page Not Found");
  }
});

app.get("/u/:shortURL", (req, res) => {
  const longURL = urlDatabase[req.params.shortURL];
  if (longURL) {
    res.redirect(longURL);
  } else {
    res.statusCode = 404;
    res.send("404 Page Not Found");
  }
});

app.post("/urls/:shortURL/delete", (req, res) => {
  const shortURL = req.params.shortURL;
  delete urlDatabase[shortURL];
  res.redirect("/urls");
});

app.post("/urls/:id", (req, res) => {
  const shortURL = req.params.id;
  urlDatabase[shortURL] = req.body.longURL;
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