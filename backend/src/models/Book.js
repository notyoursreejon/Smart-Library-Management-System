const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title:            { type: String, required: true, trim: true },
  author:           { type: String, required: true, trim: true },
  isbn:             { type: String, required: true, unique: true, trim: true },
  category:         { type: String, default: 'General' },
  description:      { type: String, default: '' },
  cover_url:        { type: String, default: '' },
  pdf_path:         { type: String, default: '' },
  total_copies:     { type: Number, default: 1, min: 0 },
  available_copies: { type: Number, default: 1, min: 0 },
  published_year:   { type: Number, default: null },
  publisher:        { type: String, default: '' },
}, { timestamps: true });

bookSchema.index({ title: 'text', author: 'text', isbn: 'text' });
bookSchema.index({ isbn: 1 });
bookSchema.index({ category: 1 });

module.exports = mongoose.model('Book', bookSchema);
