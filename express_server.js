const express = require("express");
const app = express();
const bcrypt = require("bcrypt-nodejs");
const cookieSession = require("cookie-session");
const methodOverride = require('method-override');

const { generateRandomString, findUserByEmail, urlsForUser, analyzeLinkVisits } = require("./helpers");
const PORT = 8080; // default port 8080

app.use(express.urlencoded({ extended: true }));
app.use(cookieSession({
  name: 'session',
  secret: "rumpelsteilskein", // change this to your own secret after forking this repo
  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));
app.use(methodOverride('_method'));

app.set("view engine", "ejs");

/**
 * Initialize the databases for urls and for users
 * These will be added to when a new users sign up
 * and when users create shortr urls
 */
const urlDatabase = {};
const users = {};


// request --> GET / --> user arrives at home screen
app.get("/", (req, res) => {
  const uid = req.session.userId;
  const user = users[uid];
  // if user is logged in, redirect to /urls
  if (user) {
    return res.redirect("/urls");
  } else { // otherwise, redirect to login screen
    return res.redirect("/login");
  }
});


// request --> GET /urls --> users can see all the urls which they have created
app.get("/urls", (req, res) => {
  const userId = req.session.userId;
  // if user is not logged in, redirect them to login screen
  if (!userId) {
    return res.status(400).render("error", {
      user: undefined,
      message: "Login is required for viewing urls"
    });
  }
  // render the urls_index template
  const userURLs = urlsForUser(userId, urlDatabase);
  const templateVars = {
    user: users[userId],
    urls: userURLs
  };
  res.render("urls_index", templateVars);
});


// request --> POST /urls --> a new short url is created
app.post("/urls", (req, res) => {
  const userId = req.session.userId;
  const user = users[userId];
  // if user is not logged in, show error message
  if (!user) {
    return res.status(400).render("error", {
      user: undefined,
      message: "Login is required for Editing urls"
    });
  }
  // gather longURL data which user provided
  const longURL = req.body.longURL;
  // generate a shortURL,
  const shortURL = generateRandomString();
  // associate it with the longURL and the user,
  urlDatabase[shortURL] = {
    longURL,
    uid: userId
  };
  // add an timestamps array to the object
  // timestamps is an array of objects --> [ { time: ..., user: ... }, {}, {}, ... ])
  urlDatabase[shortURL].timestamps = [{ userId, time: Date.now().toString() }];
  // and redirect to /urls/:id, where :id matches the ID of the newly saved URL
  res.redirect(`http://localhost:${PORT}/urls/${shortURL}`);
});


// request --> GET /urls/new --> renders a form which can be filled in
// with the original long url
app.get("/urls/new", (req, res) => {
  const userId = req.session.userId;
  const user = users[userId];
  // if user is not logged in, redirect them to login screen
  if (!userId) {
    return res.redirect("/login");
  }
  // render the urls_new template
  res.render("urls_new", { user });
});


// request --> GET /urls/:shortURL --> dispays a form for editing
// the long url associated with the provided :shortURL
app.get("/urls/:shortURL", (req, res) => {
  const userId = req.session.userId;
  const user = users[userId];
  // if user is not signed in, show error message
  if (!userId) {
    return res.status(400).render("error", {
      user: undefined,
      message: "Login is required for Editing urls"
    });
  }
  const shortURL = req.params.shortURL;
  // if :shortURL doesn't exist, show error message
  if (!(shortURL in urlDatabase)) {
    res.status(404).render("error", {
      user,
      message: "URL not found"
    });
  }
  const userURLs = urlsForUser(userId, urlDatabase);
  // if :shortURL doesn't belong to the user, show error message
  if (!(shortURL in userURLs)) {
    res.status(400).render("error", {
      user,
      message: "You can only edit your own URLs"
    });
  }
  // get analytics for the link
  const { visits, uniqueUsers } = analyzeLinkVisits(userURLs, shortURL);
  const timestamps = userURLs[shortURL].timestamps;
  const genesis = timestamps[0];
  // render the form for editing the long url
  res.render("urls_show", {
    user,
    shortURL,
    longURL: userURLs[shortURL].longURL,
    visits,
    uniqueUsers: uniqueUsers.length,
    timestamps,
  });
});


// request --> GET /u/:shortURL --> go to the longURL website
// which is associated with a a given :shortURL
app.get("/u/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  const user = users[req.session.userId];
  // if :shortURL doesn't exist, show error message
  if (!(shortURL in urlDatabase)) {
    return res.status(404).render("error", {
      user,
      message: `shortURL ${shortURL} not found`
    });
  }
  const longURL = urlDatabase[shortURL].longURL;
  // update timestamps for the shortURl when a link is visited
  urlDatabase[shortURL].timestamps.push({ userId: user ? user.id : null, time: Date.now().toString() });
  const { visits, uniqueUsers } = analyzeLinkVisits(urlDatabase, shortURL);
  // redirect the user to the (longURL) website
  res.redirect(longURL);
});


// request --> DELETE /urls/:id/delete --> delete the (:id) shortURL
app.delete("/urls/:id", (req, res) => {
  const shortURL = req.params.id;
  const uid = req.session.userId;
  // if user is not logged in, show error message
  if (!uid) {
    return res.status(400).render("error", {
      user: undefined,
      message: "Login is required for updating a url"
    });
  }
  const userURLs = urlsForUser(uid, urlDatabase);
  // if url belongs to another user, show error message
  if (!(shortURL in userURLs)) {
    return res.status(400).render("error", {
      user: users[uid],
      message: "Deletion of another user's url is not allowed"
    });
  }
  // delete the url and redirect to /urls
  delete urlDatabase[shortURL];
  res.redirect("/urls");
});


// request --> PUT /urls/:id --> update a url which was earlier created
app.put("/urls/:id", (req, res) => {
  const shortURL = req.params.id;
  const uid = req.session.userId;
  // if user is not logged in, show error message
  if (!uid) {
    return res.status(400).render("error", {
      user: undefined,
      message: "Login is required for updating a url"
    });
  }
  const userURLs = urlsForUser(uid, urlDatabase);
  // if the url doesn't belong to the user, show error message
  if (!(shortURL in userURLs)) {
    return res.status(400).render("error", {
      user: users[uid],
      message: "Editing another user's url is not allowed"
    });
  }
  // update the url,
  urlDatabase[shortURL] = {
    longURL: req.body.longURL,
    uid,
    timestamps: [{ uid, time: Date.now().toString() }]
  };
  res.redirect("/urls");
});


// request --> GET /register --> display signup/registration form
app.get("/register", (req, res) => {
  const uid = req.session.userId;
  const user = users[uid];
  // if user is already logged in, redirect to /urls
  if (user) {
    return res.redirect("/urls");
  }
  // render the registration form
  res.render("user_registration", { user });
});


// request --> POST /register --> create a new user
app.post("/register", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  // if email or password are empty, show error message
  if (email === "" || password === "") {
    return res.status(400).render("error", {
      user: undefined,
      message: "Bad Request: email and password cannot be empty"
    });
  }
  // if email already exists, show error message
  if (findUserByEmail(email, users)) {
    return res.status(400).render("error", {
      user: undefined,
      message: "Bad Request: email already exists"
    });
  }
  // create an identifier (id) for user
  const id = generateRandomString();
  // create a hash of the user password
  const hashedPassword = bcrypt.hashSync(password);
  // create user
  users[id] = { id, email, hashedPassword };
  // set a cookie and redirect to /urls
  req.session.userId = id;
  res.redirect("/urls");
});


// request --> GET /login --> display login form
app.get("/login", (req, res) => {
  const uid = req.session.userId;
  const user = users[uid];
  // if user is already logged in, redirect to /urls
  if (user) {
    return res.redirect("/urls");
  }
  // render the login form
  res.render("login_form", { user });
});


// request --> POST /login --> login user to website
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = findUserByEmail(email, users);
  // if provided email doesn't exist, show error message
  if (!user) {
    return res.status(400).render("error", {
      user: undefined,
      message: "Error while signing in: user does not exist"
    });
  }
  // if password doesn't match, show error message
  const match = bcrypt.compareSync(password, user.hashedPassword);
  if (!match) {
    return res.status(400).render("error", {
      user: undefined,
      message: "Error while signing in: password does not match"
    });
  }
  // set a cookie and redirect to /urls
  req.session.userId = user.id;
  res.redirect("/urls");
});


// request --> POST /logout --> log the user out
app.post("/logout", (req, res) => {
  // delete the cookie
  req.session = null;
  // redirect to /urls
  res.redirect("/urls");
});




app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});