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
const Task = require("./models/Task");
const auth = require("./middleware/auth");
const admin = require("./middleware/admin");

// ROOT
app.get("/", (req, res) => {
  res.send("API Running");
});

// ================= AUTH =================

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

// ================= DASHBOARD =================

app.get("/dashboard", auth, (req, res) => {
  res.send("Welcome user " + req.user.id);
});

// ================= PROJECT =================

// CREATE PROJECT (Admin only)
app.post("/projects", auth, admin, async (req, res) => {
  try {
    const { name, members } = req.body;

    // Convert members' IDs to ObjectId
    const membersIds = members.map((member) => new mongoose.Types.ObjectId(member));

    const project = await Project.create({
      name,
      members: membersIds // Use ObjectId array for members
    });

    res.json(project);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// GET PROJECTS
app.get("/projects", auth, async (req, res) => {
  try {
    const projects = await Project.find().populate("members"); // Fetch projects with members populated
    res.json(projects);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// ================= TASK =================

// CREATE TASK
app.post("/tasks", auth, async (req, res) => {
  try {
    const { title, assignedTo, project, dueDate, status } = req.body;

    // Validate ObjectId for assignedTo and project
    if (!mongoose.Types.ObjectId.isValid(assignedTo) || !mongoose.Types.ObjectId.isValid(project)) {
      return res.status(400).send("Invalid ObjectId for assignedTo or project.");
    }

    // Use 'new' for ObjectId conversion
    const assignedToId = new mongoose.Types.ObjectId(assignedTo);
    const projectId = new mongoose.Types.ObjectId(project);
    const taskStatus = status || "todo"; // Default value to 'todo' if not provided

    const task = await Task.create({
      title,
      assignedTo: assignedToId,
      project: projectId,
      dueDate,
      status: taskStatus // Default value to 'todo'
    });

    res.json(task);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// GET ALL TASKS
app.get("/tasks", auth, async (req, res) => {
  try {
    const tasks = await Task.find().populate("assignedTo project");
    res.json(tasks);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// UPDATE TASK
app.put("/tasks/:id", auth, async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(task);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// OVERDUE TASKS
app.get("/tasks/overdue", auth, async (req, res) => {
  const today = new Date();

  const tasks = await Task.find({
    dueDate: { $lt: today }, // Tasks with due date earlier than today
    status: { $ne: "done" } // Tasks that are not marked as "done"
  });

  res.json(tasks);
});

// ================= DB CONNECT =================

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("DB Connected");

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log("Server running on port " + PORT);
    });
  })
  .catch(err => console.log(err));