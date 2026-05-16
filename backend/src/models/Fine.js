const mongoose = require('mongoose');

const fineSchema = new mongoose.Schema({
  issue_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', required: true },
  user_id:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount:   { type: Number, required: true, default: 0 },
  paid:     { type: Boolean, default: false },
  paid_at:  { type: Date, default: null },
}, { timestamps: true });

fineSchema.index({ user_id: 1 });
fineSchema.index({ paid: 1 });

module.exports = mongoose.model('Fine', fineSchema);
