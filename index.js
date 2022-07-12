const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "goodreads.db");
const app = express();

app.use(express.json());

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(-1);
  }
};
initializeDBAndServer();

// user Api
app.post("/users/", async (request, response) => {
  const { username, password, gender, location } = request.body;
  const getUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(getUserQuery);
  if (dbUser === undefined) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const addUserQuery = `INSERT INTO user(username,password,gender,location)  
        VALUES('${username}','${hashedPassword}','${gender}','${location}');`;
    await db.run(addUserQuery);
    response.send("User is Created Successfully");
  } else {
    response.status(400);
    response.send("User already Exist");
  }
});

//login Api
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const getUserQuery = `SELECT * FROM  user WHERE username = '${username}';`;
  const dbUser = await db.get(getUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isMatchedPassword = await bcrypt.compare(password, dbUser.password);
    if (isMatchedPassword === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "SECRET_KEY");
      console.log(jwtToken);
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});

const authenticateToken = (request, response, next) => {
  const authHeader = request.headers["authorization"];
  const jwtToken = authHeader.split(" ")[1];
  jwt.verify(jwtToken, "SECRET_KEY", async (error, payload) => {
    if (error) {
      response.status(400);
      response.send("Invalid Access Token");
    } else {
      console.log(payload);
      request.username = payload.username;
      next();
    }
  });
};

app.get("/books/", authenticateToken, async (request, response) => {
  const getBooksQuery = `SELECT * FROM book ORDER BY book_id ASC;`;
  const booksArray = await db.all(getBooksQuery);
  const { username } = request;
  //console.log(username);
  response.send(booksArray);
});

app.get("/profile/", authenticateToken, async (request, response) => {
  const { username } = request;
  const getProfileQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const profile = await db.get(getProfileQuery);
  response.send(profile);
});
