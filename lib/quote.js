module.exports = function(text) {
  if (text[0] === text[text.length - 1] === '"') {
    return text;
  }
  return '"' + text + '"';
};
