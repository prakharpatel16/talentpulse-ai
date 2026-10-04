// Vector embedding utilities and similarity calculation

function generatePseudoEmbedding(text, dimensions = 768) {
  // Deterministic normalized embedding vector based on string hash characteristics
  const vector = new Array(dimensions).fill(0);
  const cleanText = (text || '').toLowerCase();
  
  for (let i = 0; i < cleanText.length; i++) {
    const charCode = cleanText.charCodeAt(i);
    const index = (charCode * 31 + i * 17) % dimensions;
    vector[index] += Math.sin(charCode * (i + 1));
  }

  // Normalize vector to unit length
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vector.map(val => Number((val / magnitude).toFixed(6)));
}

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return Math.max(0, Math.min(1, similarity));
}

module.exports = {
  generatePseudoEmbedding,
  cosineSimilarity
};
