const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  title: String,
  status: {
    type: String,
    enum: ["todo", "in-progress", "done"],
    default: "todo" // Change this to 'todo' if it's 'done' currently
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project"
  },
  dueDate: Date
});

module.exports = mongoose.model("Task", taskSchema);