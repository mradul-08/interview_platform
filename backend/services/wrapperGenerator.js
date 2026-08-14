function generateWrapperSource({ sourceCode, language, stdin }) {
  // Kept as a compatibility helper for old callers. The active executor uses
  // the stdin/stdout contract and never transforms user source.
  const generatedSource = String(sourceCode || "");
  return {
    generatedSource,
    wrapper: generatedSource,
  };
}

module.exports = {
  generateWrapperSource,
};
