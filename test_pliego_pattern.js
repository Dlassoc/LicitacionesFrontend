#!/usr/bin/env node

const testName = "5. PROYECTO DE PLIEGOS PLIEGO DE CONDICIONES.pdf";
const pattern = /pliego\s+de\s+condiciones?/i;

console.log(`Testing: "${testName}"`);
console.log(`Pattern: ${pattern}`);
console.log(`Match result: ${pattern.test(testName)}`);

if (pattern.test(testName)) {
  console.log("✅ MATCHES - Pattern works correctly");
} else {
  console.log("❌ NO MATCH - Pattern doesn't match");
  
  // Debug: Show what the pattern is looking for
  console.log("\nPattern breakdown:");
  console.log("- 'pliego' (case-insensitive)");
  console.log("- whitespace");
  console.log("- 'de'");
  console.log("- whitespace");
  console.log("- 'condiciones' or 'condicion'");
}
