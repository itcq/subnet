function isHtmlDocument(file) {
  return /\.html?$/i.test(file);
}

module.exports = { isHtmlDocument };
