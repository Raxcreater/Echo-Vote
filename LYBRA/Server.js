const express = require("express");
const bodyParser = require("body-parser");

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const connection = require("./DataBase");
const { userRoute, adminRoute } = require("./Router/index");
const adminLogin = require("./adminSetup");

app.use("/user", userRoute);
app.use("/admin", adminRoute);

//Test api
// app.get("/", (req, res) => {
//   res.send("Hello World!");
// });

connection.database_connection();
adminLogin.get_adminLogin();

app.listen(6000, () => {
  console.log("Listening on port:", 6000);
});

// APP  Strecture:
// https://stackgeeks.invisionapp.com/console/share/PZAHFCW3UVT/980282217/play
