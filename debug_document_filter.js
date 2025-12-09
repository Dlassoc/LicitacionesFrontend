#!/usr/bin/env node

// Simular exactamente los patrones y nombres que vimos en el browser

const DOCUMENTS_TO_PRIORITIZE_PATTERNS = [
  /estudio.*previo/i,
  /estados?\s+financieros?/i,
  /indicadores?\s+financieros?/i,
  /indicadores?\s+organizacionales?/i,
  /requisitos?\s+habilitantes?\s+financieros?/i,
  /capacidad\s+financiera/i,
  /balance\s+general/i,
  /estados?\s+de\s+resultados?/i,
  /estado\s+de\s+flujo\s+de\s+caja/i,
  /pliego\s+de\s+condiciones?/i,  // ← El patrón
  /(?=.*\.zip)(?=.*estudio\s+financiero)/i,
  /(?=.*\.zip)(?=.*estados?\s+financieros?)/i,
  /(?=.*\.zip)(?=.*balance\s+general)/i,
  /(?=.*\.zip)(?=.*indicadores?\s+financieros?)/i,
];

const DOCUMENTS_TO_SKIP_PATTERNS = [
  /aprobaci[óo]n/i,
  /aprobado/i,
  /p[óo]liza/i,
  /p[óo]lizas/i,
  /matriz.*riesgo/i,
  /riesgo/i,
  /cotizaci[óo]n/i,
  /cotizaciones/i,
  /cotizado/i,
  /\bcdp\b/i,
  /certificado.*disponibilidad.*presupuestal/i,
  /registro.*presupuestal/i,
  /presupuestal/i,
  /aprobaci[óo]n.*garant[ií]/i,
  /garant[ií]/i,
  /t[ée]rminos.*referencia/i,
  /tr\b/i,
  /planeaci[óo]n/i,
  /presupuesto.*interno/i,
  /\bacta\b/i,
  /resoluci[óo]n/i,
  /acuerdo/i,
];

function isPriorityDocument(title) {
  return DOCUMENTS_TO_PRIORITIZE_PATTERNS.some(pattern => pattern.test(title));
}

function shouldSkipDocument(title) {
  return DOCUMENTS_TO_SKIP_PATTERNS.some(pattern => pattern.test(title));
}

// Los documentos que vimos en la captura
const testDocuments = [
  "1 PRESUPUESTO.pdf",
  "2 CDP (2).pdf",
  "2 CDP.pdf",
  "3 ANALISIS DEL SECTOR.pdf",
  "4 ESTUDIO PREVIO.pdf",
  "5 PAA.pdf",
  "7 CONVOCATORIA PUBLICA.pdf",
  "8. VIABILIDAD.pdf",
  "8.1 VIABILIDAD.pdf",
  "2. Presupuesto Interventoría - Factor Multiplicador - Plan de Cargas.xlsx",
  "1. Copia de Matriz de Riesgo.xlsx",
  "5. PROYECTO DE PLIEGOS PLIEGO DE CONDICIONES.pdf"  // ← EL DOCUMENTO IMPORTANTE
];

console.log("Testing document filtering:\n");
console.log("=" .repeat(80));

const priorityDocs = [];
const otherDocs = [];

testDocuments.forEach(docTitle => {
  const isPriority = isPriorityDocument(docTitle);
  const shouldSkip = shouldSkipDocument(docTitle);
  
  if (isPriority) {
    priorityDocs.push(docTitle);
    console.log(`✅ PRIORITY: ${docTitle}`);
  } else if (shouldSkip) {
    console.log(`⏭️  SKIP:     ${docTitle}`);
  } else {
    otherDocs.push(docTitle);
    console.log(`❓ OTHER:    ${docTitle}`);
  }
});

console.log("\n" + "=".repeat(80));
console.log("\nRESUMEN:");
console.log(`Priority docs (${priorityDocs.length}):`, priorityDocs);
console.log(`Other docs (${otherDocs.length}):`, otherDocs);
console.log("\nDocsToProcess would be:");
const docsToProcess = priorityDocs.length > 0 ? priorityDocs : otherDocs;
console.log(`${docsToProcess.length} documentos:`, docsToProcess);

// Verificación específica
console.log("\n" + "=".repeat(80));
console.log("\nVERIFICACIÓN DEL PATRÓN 'pliego de condiciones':");
const pattern = /pliego\s+de\s+condiciones?/i;
const pliegoDoc = "5. PROYECTO DE PLIEGOS PLIEGO DE CONDICIONES.pdf";
console.log(`Documento: "${pliegoDoc}"`);
console.log(`Patrón: ${pattern}`);
console.log(`¿Coincide?: ${pattern.test(pliegoDoc)}`);

// Buscar todas las coincidencias
const matches = pliegoDoc.match(pattern);
console.log(`Coincidencias: ${matches ? matches[0] : 'NINGUNA'}`);
