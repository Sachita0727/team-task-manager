require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");

const app = express();
app.use(express.json());

// IMPORTS
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Project = require("./models/Project");
const auth = require("./middleware/auth");
const admin = require("./middleware/admin");

// ROUTES
app.get("/", (req, res) => {
  res.send("API Running");
});

// SIGNUP
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    res.json(user);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) return res.status(400).send("User not found");

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) return res.status(400).send("Wrong password");

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET
    );

    res.json({ token });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// DASHBOARD (Protected)
app.get("/dashboard", auth, (req, res) => {
  res.send("Welcome user " + req.user.id);
});

// CREATE PROJECT (Admin only)
app.post("/projects", auth, admin, async (req, res) => {
  try {
    const project = await Project.create(req.body);
    res.json(project);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// GET PROJECTS
app.get("/projects", auth, async (req, res) => {
  const projects = await Project.find().populate("members");
  res.json(projects);
});

// DB CONNECT + SERVER START
mongoose.connect(process.env.MONGO_URI)
.then(() => {
  console.log("DB Connected");
  app.listen(5000, () => console.log("Server started on port 5000"));
})
.catch(err => console.log(err));

const Task = require("./models/Task");
app.post("/tasks", auth, async (req, res) => {
  try {
    const task = await Task.create(req.body);
    res.json(task);
  } catch (err) {
    res.status(500).send(err.message);
  }
});
app.get("/tasks", auth, async (req, res) => {
  const tasks = await Task.find().populate("assignedTo project");
  res.json(tasks);
});
app.put("/tasks/:id", auth, async (req, res) => {
  const task = await Task.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  res.json(task);
});