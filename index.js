const express = require("express");
const redis = require("redis");
const util = require("util");
const axios = require("axios");

const app = express();
app.use(express.json());

var client = require("redis").createClient();

client.on("connect", log("connect"));
client.on("ready", log("ready"));
client.on("reconnecting", log("reconnecting"));
client.on("error", log("error"));
client.on("end", log("end"));

function log(type) {
  return function () {
    console.log(type, arguments);
  };
}

client.set = util.promisify(client.set);
client.get = util.promisify(client.get);

app.get("/", async (req, res) => {
  res.send("All good!!!");
});

//Using only redis without db

app.post("/", async (req, res) => {
  const { key, value } = req.body;
  const response = await client.set(key, value);
  res.json(response);
});

app.get("/:id", async (req, res) => {
  const { id } = req.params;
  const response = await client.get(id);
  res.json(response);
});

//Using redis with REST api and db

app.get("/posts/:id", async (req, res) => {
  const { id } = req.params;

  const cached = await client.get("posts/" + id);

  //check if cache has the data. if it does return it
  if (cached) return res.json(JSON.parse(cached));

  const response = await axios.get(
    "https://jsonplaceholder.typicode.com/posts/" + id
  );

  //since the cache did not have it. add it to the redis cache
  client.set(
    "posts/" + id,
    JSON.stringify(response.data)
    //expire after 10 secs
    // "EX", 10
  );
  res.send(response.data);
});

app.listen(5000, () => {
  console.log("running on port 5000");
});
