const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  book_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  user_id:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  issued_by:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  issue_date:  { type: Date, default: Date.now },
  due_date:    { type: Date, required: true },
  return_date: { type: Date, default: null },
  status:      { type: String, enum: ['issued', 'returned', 'overdue'], default: 'issued' },
}, { timestamps: true });

issueSchema.index({ user_id: 1 });
issueSchema.index({ book_id: 1 });
issueSchema.index({ status: 1 });

module.exports = mongoose.model('Issue', issueSchema);
