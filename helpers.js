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

module.exports = { generateRandomString, findUserByEmail, urlsForUser };