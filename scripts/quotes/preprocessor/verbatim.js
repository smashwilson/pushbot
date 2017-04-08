// Accept text as-is from a command's input. Derive no speakers or about metadata.

module.exports = function(text) {
  return {
    body: text,
    attributes: []
  };
};
