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

function findUserByEmail(email, usersDb) {
  for (const uid in usersDb) {
    if (usersDb[uid].email === email) {
      return usersDb[uid];
    }
  }
}

function urlsForUser(uid, urlDb) {
  const output = {};
  for (const shortURL in urlDb) {
    if (urlDb[shortURL].uid === uid) {
      output[shortURL] = urlDb[shortURL];
    }
  }
  return output;
}

function analyzeLinkVisits(urlDatabase, url) {
  const timestamps = urlDatabase[url].timestamps;
  const visits = timestamps.length - 1; // - 1 because first item was created when the shortURL was generated

  // find out users who clicked on the link
  const clickingUsers = timestamps.map(x => x.userId);
  console.log(clickingUsers);

  // filter out users who weren't logged in
  const identifiedUsers = clickingUsers.filter(x => x !== null);
  console.log(identifiedUsers);

  // find unique users who visited the link
  const uniqueUsers = [...new Set(identifiedUsers)];

  return { visits, uniqueUsers };
}

module.exports = { generateRandomString, findUserByEmail, urlsForUser, analyzeLinkVisits };