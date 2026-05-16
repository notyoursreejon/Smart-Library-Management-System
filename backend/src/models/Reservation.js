const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  book_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  user_id:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reserved_at:    { type: Date, default: Date.now },
  status:         { type: String, enum: ['pending', 'fulfilled', 'cancelled'], default: 'pending' },
  queue_position: { type: Number, default: 1 },
}, { timestamps: true });

reservationSchema.index({ book_id: 1 });
reservationSchema.index({ user_id: 1 });
reservationSchema.index({ status: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);
