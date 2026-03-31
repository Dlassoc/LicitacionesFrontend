import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import Header from "../components/Header.jsx";
import ResultsPanel from "../components/ResultsPanel.jsx";
import ResultModal from "../components/ResultModal.jsx";
import { useSearchResults } from "../features/hooks.js";
import { useDiscardedLicitaciones } from "../hooks/useDiscardedLicitaciones.js";  // 🗑️ NUEVO
import { useMatchedLicitaciones } from "../hooks/useMatchedLicitaciones.js";
import { useAnalyzedLicitaciones } from "../hooks/useAnalyzedLicitaciones.js";  // 📦 NUEVO - Carga de BD local
import { useAutoAnalysis } from "../hooks/useAutoAnalysis.js";  // 🆕 AUTO-ANÁLISIS
import { useAuth } from "../auth/AuthContext.jsx";
import SplashScreen from "../components/SplashScreen.jsx";
import WelcomeToast from "../components/WelcomeToast.jsx";
import Toast from "../components/Toast.jsx";

export default function App() {
  const { ready, user } = useAuth();
  const location = useLocation();

  const {
    resultados, loading, error,
    total, limit, offset, lastQuery, isFromCache, chips,
    buscar, cargarMisLicitaciones, limpiar, goPage
  } = useSearchResults(21);
  
  const { discarded, discardedIds, loadDiscarded, discardLicitacion, restoreDiscarded, isDiscarded } = useDiscardedLicitaciones();  // 🗑️ NUEVO
  const { matchedLicitaciones, loadingMatched, errorMatched, loadMatched, clearMatched } = useMatchedLicitaciones();
  const { analyzedLicitaciones, loadingAnalyzed, errorAnalyzed, loadAnalyzed, clearAnalyzed } = useAnalyzedLicitaciones();  // 📦 NUEVO
  const { analysisStatus, isPolling, allResultados, resumen, paginationStatus } = useAutoAnalysis(resultados, { lastQuery, total, limit, offset }, goPage);  // 🆕 AUTO-ANÁLISIS + destructurar allResultados, resumen, paginationStatus

  const normalizeCumpleValue = (raw) => {
    if (raw === null || raw === undefined) return null;
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'number') return raw > 0;
    if (typeof raw === 'string') {
      const v = raw.trim().toLowerCase();
      if (['1', 'true', 't', 'yes', 'y', 'si', 's'].includes(v)) return true;
      if (['0', 'false', 'f', 'no', 'n'].includes(v)) return false;
      if (!v) return null;
    }
    return null;
  };

  // 🔧 Helper: Crear analysisStatus normalizado ANTES de useMemo
  const createAnalysisStatus = (item, isMatched, isAnalyzed) => {
    const estado = String(item?.estado || '').toLowerCase();
    const requisitos = item?.requisitos_extraidos;
    const detalles = item?.detalles;
    const hasRequisitos = requisitos && typeof requisitos === 'object' && Object.keys(requisitos).length > 0;
    const hasDetalles = detalles && typeof detalles === 'object' && Object.keys(detalles).length > 0;
    const hasEvidence = hasRequisitos || hasDetalles || item?.cumple !== undefined;
    const terminalStates = new Set(['completado', 'sin_documentos', 'error']);
    const isFinalLike = terminalStates.has(estado) || (isAnalyzed && hasEvidence);

    // Si es analizado y tiene cumple, mostrar resultado (sin depender de campo estado)
    if (isAnalyzed && isFinalLike) {
      return { 
        estado: terminalStates.has(estado) ? estado : 'completado', 
        cumple: normalizeCumpleValue(item.cumple), 
        porcentaje: item.porcentaje_cumplimiento || 0, 
        requisitos: normalizeRequisitos(item.requisitos_extraidos || {}),
        detalles: item.detalles || {}
      };
    }

    // Si es apta (matched), siempre completado con cumple=true
    if (isMatched) {
      return {
        estado: 'completado',
        cumple: true,
        porcentaje: item.score || 0,
        requisitos: normalizeRequisitos(item.requisitos_extraidos || {})
      };
    }
    
    // Fallback para datos antiguos o en progreso
    if (item.from_cache && isFinalLike) {
      return { 
        estado: terminalStates.has(estado) ? estado : 'completado', 
        cumple: normalizeCumpleValue(item.cumple), 
        porcentaje: item.porcentaje_cumplimiento || 0, 
        requisitos: normalizeRequisitos(item.requisitos_extraidos || {}),
        detalles: item.detalles || {}
      };
    }
    
    return null;
  };

  // 🔧 NUEVA: Normalizar estructura de requisitos extraídos
  // Algunos vienen como indicadores_financieros, otros como matrices
  // Esta función las unifica en un formato que ResultCard espera
  const normalizeRequisitos = (requisitos) => {
    if (!requisitos || typeof requisitos !== 'object') return {};
    
    const normalized = { ...requisitos };
    
    // 🔧 Buscar indicadores en TODAS las posibles ubicaciones
    let foundIndicators = null;
    
    // Intento 1: indicadores_financieros.matrices.miPYME/no_miPYME (nueva estructura)
    if (requisitos.indicadores_financieros?.matrices) {
      const matrices = requisitos.indicadores_financieros.matrices;
      if (matrices.miPYME || matrices.no_miPYME || matrices.mipyme || matrices.no_mipyme) {
        foundIndicators = {};
        ['miPYME', 'no_miPYME', 'mipyme', 'no_mipyme'].forEach(tipo => {
          if (matrices[tipo] && typeof matrices[tipo] === 'object') {
            Object.assign(foundIndicators, matrices[tipo]);
          }
        });
        console.log('[APP] 🔧 Extrayendo indicadores de indicadores_financieros.matrices (miPYME/mipyme)');
      } else {
        foundIndicators = matrices;
        console.log('[APP] 🔧 Usando indicadores_financieros.matrices');
      }
    }
    
    // Intento 2: indicadores_financieros con estructura anidada directa (miPYME, no_miPYME)
    if (!foundIndicators && requisitos.indicadores_financieros && typeof requisitos.indicadores_financieros === 'object') {
      const indFin = requisitos.indicadores_financieros;
      if (indFin.miPYME || indFin.no_miPYME || indFin.mipyme || indFin.no_mipyme) {
        foundIndicators = {};
        ['miPYME', 'no_miPYME', 'mipyme', 'no_mipyme'].forEach(tipo => {
          if (indFin[tipo] && typeof indFin[tipo] === 'object') {
            Object.assign(foundIndicators, indFin[tipo]);
          }
        });
        console.log('[APP] 🔧 Extrayendo indicadores de indicadores_financieros (miPYME/mipyme)');
      } else {
        foundIndicators = indFin;
        console.log('[APP] 🔧 Usando indicadores_financieros directamente');
      }
    }
    
    // Intento 3: matrices (estructura tradicional)
    if (!foundIndicators && requisitos.matrices) {
      foundIndicators = requisitos.matrices;
      console.log('[APP] 🔧 Usando matrices directamente');
    }
    
    // Asignar los indicadores encontrados a matrices
    if (foundIndicators && Object.keys(foundIndicators).length > 0) {
      normalized.matrices = foundIndicators;
    }
    
    return normalized;
  };

  const normalizeFromDB = (item, sourceTag = 'UNKNOWN') => {
    if (!item) return item;
    const isMatched = sourceTag === 'MATCHED';
    // 🔧 MEJORADO: Detectar como analizado simplemente si tiene campo cumple definido (true, false o null)
    const estado = String(item?.estado || '').toLowerCase();
    const requisitos = item?.requisitos_extraidos;
    const detalles = item?.detalles;
    const hasRequisitos = requisitos && typeof requisitos === 'object' && Object.keys(requisitos).length > 0;
    const hasDetalles = detalles && typeof detalles === 'object' && Object.keys(detalles).length > 0;
    const hasEvidence = hasRequisitos || hasDetalles || item?.cumple !== undefined;
    const terminalStates = new Set(['completado', 'sin_documentos', 'error']);
    const isAnalyzed = sourceTag === 'ANALYZED' || (
      (item.id_portafolio || item.ID_Portafolio) &&
      (terminalStates.has(estado) || hasEvidence)
    );
    const id_portafolio = item.id_portafolio || item.ID_Portafolio || (isMatched ? item.referencia : item.id);
    let referencia = id_portafolio;
    try {
      if (item.detalles && typeof item.detalles === 'object') {
        const refs = Object.values(item.detalles).filter(v => typeof v === 'string' && v.length > 0);
        if (refs.length > 0) referencia = refs[0];
      }
    } catch (e) {
      if (isMatched && item.referencia) referencia = item.referencia;
    }
    return {
      ...item,
      ID_Portafolio: id_portafolio, id_del_portafolio: id_portafolio, id_portafolio: id_portafolio,
      Referencia_del_proceso: item.referencia || referencia || item.Referencia_del_proceso,
      Entidad: item.entidad || item.Entidad || 'Entidad no disponible',
      Descripcion: item.objeto_contratar || item.Descripcion || item.descripcion || '',
      OBJETO_A_CONTRATAR: item.objeto_contratar || item.OBJETO_A_CONTRATAR || '',
      DESCRIPCION_DEL_PROCESO: item.objeto_contratar || item.DESCRIPCION_DEL_PROCESO || '',
      Precio_base: item.precio || item.cuantia || item.Precio_base,
      Departamento_de_la_entidad: item.departamento || item.Departamento_de_la_entidad || '',
      Ciudad_entidad: item.ciudad || item.Ciudad_entidad || '',
      Fecha_publicacion: item.fecha_publicacion || item.Fecha_publicacion || '',
      Fase: isAnalyzed ? (item.Fase || item.fase || 'Analizado') : (item.estado || item.Fase || item.fase || ''),
      URL_Proceso: item.enlace || item.url || item.URL_Proceso || '#',
      score: item.porcentaje !== null && item.porcentaje !== undefined ? item.porcentaje : (item.porcentaje_cumplimiento !== null && item.porcentaje_cumplimiento !== undefined ? item.porcentaje_cumplimiento : (item.score !== null && item.score !== undefined ? item.score : 0)),
      requisitos_extraidos: item.requisitos_extraidos || item.requisitos || {},
      _fromMatched: isMatched, _fromAnalyzed: isAnalyzed,
      _analysisStatus: createAnalysisStatus(item, isMatched, isAnalyzed)
    };
  };

  // MEMOIZAR: Calcular resultados filtrados SOLO cuando las dependencias cambien realmente
  // Esto evita que se recree el array en cada render, causando flickering en categorizacion
  const memoizedResults = useMemo(() => {
    const baseSecopResults = allResultados && allResultados.length > 0 ? allResultados : resultados;

    console.log('[APP] ============================================');
    console.log('[APP] 🔄 Recalculando memoizedResults...');
    console.log('[APP] - resultados (SECOP base):', baseSecopResults?.length || 0);
    console.log('[APP] - resultados (SECOP página):', resultados?.length || 0);
    console.log('[APP] - resultados acumulados:', allResultados?.length || 0);
    console.log('[APP] - matchedLicitaciones:', matchedLicitaciones?.length || 0);
    console.log('[APP] - analyzedLicitaciones:', analyzedLicitaciones?.length || 0);
    console.log('[APP] ============================================');
    
    let combined = [];
    const seenIds = new Set();

    const mergeCacheData = (existingItem, cacheItem, sourceTag) => {
      const merged = { ...existingItem };
      merged.from_cache = true;
      merged._fromMatched = existingItem._fromMatched || cacheItem._fromMatched;
      merged._fromAnalyzed = existingItem._fromAnalyzed || cacheItem._fromAnalyzed;

      // Si llega un análisis explícito desde BD y es no-cumple, no mantener
      // bandera histórica de matched para evitar clasificación incorrecta.
      if (sourceTag === 'ANALYZED' && normalizeCumpleValue(cacheItem.cumple) === false) {
        merged._fromMatched = false;
      }

      if (cacheItem.requisitos_extraidos && Object.keys(cacheItem.requisitos_extraidos).length > 0) {
        merged.requisitos_extraidos = cacheItem.requisitos_extraidos;
      }

      // 🔧 CRÍTICO: Copiar o recrear _analysisStatus
      if (cacheItem._analysisStatus) {
        merged._analysisStatus = cacheItem._analysisStatus;
        console.log(`[APP] ✅ _analysisStatus copiado desde BD:`, cacheItem._analysisStatus);
      } else if (cacheItem.cumple !== undefined) {
        // Si no hay _analysisStatus pero sí hay cumple, recrearlo
        merged._analysisStatus = createAnalysisStatus(cacheItem, false, true);
        console.log(`[APP] ✅ _analysisStatus recreado desde cumple:`, merged._analysisStatus);
      }

      if (cacheItem.score !== undefined && cacheItem.score !== null) {
        merged.score = cacheItem.score;
      }

      if (cacheItem.porcentaje_cumplimiento !== undefined) {
        merged.porcentaje_cumplimiento = cacheItem.porcentaje_cumplimiento;
      }

      if (cacheItem.cumple !== undefined) {
        merged.cumple = cacheItem.cumple;
      }

      console.log(`[APP] ♻️ Merge BD (${sourceTag}) con SECOP para`, merged.ID_Portafolio || merged.id_del_portafolio);
      return merged;
    };

    const addOrMergeFromDB = (item, sourceTag) => {
      const normalized = normalizeFromDB(item, sourceTag);
      if (!normalized) return false;

      normalized.from_cache = true;
      const id = normalized.ID_Portafolio || normalized.id_del_portafolio;
      if (!id || isDiscarded(id)) return false;

      const existingIndex = combined.findIndex(existing => {
        const existingId = existing.ID_Portafolio || existing.id_del_portafolio;
        return existingId === id;
      });

      if (existingIndex >= 0) {
        combined[existingIndex] = mergeCacheData(combined[existingIndex], normalized, sourceTag);
        return false;
      }

      combined.push(normalized);
      seenIds.add(id);
      console.log(`[APP] 📦 ${sourceTag} agregado (sin duplicar):`, id);
      return true;
    };
    
    // 🆕 PASO 1: Agregar resultados de SECOP NORMALIZADOS (si hay)
    if (baseSecopResults && Array.isArray(baseSecopResults) && baseSecopResults.length > 0) {
      baseSecopResults.forEach(r => {
        const id = r.ID_Portafolio || r.id_del_portafolio || r.id_portafolio;
        if (!isDiscarded(id)) {
          // 🔧 Normalizar campos de ID AQUÍ antes de agregar
          const normalized = {
            ...r,
            ID_Portafolio: id,
            id_del_portafolio: id,
            id_portafolio: id
          };
          combined.push(normalized);
          seenIds.add(id);
        }
      });
      console.log('[APP] 📡 SECOP items normalizados y agregados:', combined.length);
    }
    
    // 🆕 PASO 2: Agregar MATCHED de BD que NO estén ya en SECOP
    if (matchedLicitaciones && matchedLicitaciones.length > 0) {
      let addedMatched = 0;
      matchedLicitaciones.forEach(m => {
        const id = m.id_portafolio || m.ID_Portafolio || m.referencia || m.id;
        if (!isDiscarded(id)) {
          const added = addOrMergeFromDB(m, 'MATCHED');
          if (added) {
            addedMatched++;
          }
        }
      });
      if (addedMatched > 0) {
        console.log('[APP] 📦 MATCHED de BD agregados (no duplicados):', addedMatched);
      }
    }
    
    // 🆕 PASO 3: Agregar ANALYZED de BD que NO estén ya presentes
    if (analyzedLicitaciones && analyzedLicitaciones.length > 0) {
      let addedAnalyzed = 0;
      analyzedLicitaciones.forEach(a => {
        const id = a.id_portafolio || a.ID_Portafolio;
        if (!isDiscarded(id)) {
          const added = addOrMergeFromDB(a, 'ANALYZED');
          if (added) {
            addedAnalyzed++;
          }
        }
      });
      if (addedAnalyzed > 0) {
        console.log('[APP] 📦 ANALYZED de BD agregados (no duplicados):', addedAnalyzed);
      }
    }
    
    console.log('[APP] ✅ TOTAL COMBINADO:', combined.length, '(SECOP + BD sin duplicados)');
    
    // 🆕 MEJORADO: Warning solo si hay datos de BD pero no se combinan (error real)
    // No advertir si está vacío en el estado inicial (antes de cargar de BD)
    if (combined.length === 0 && (matchedLicitaciones?.length > 0 || analyzedLicitaciones?.length > 0)) {
      console.warn('[APP] ⚠️ WARNING: Datos en BD pero memoizedResults vacío (posible error de normalizacion)');
    } else if (combined.length === 0) {
      console.log('[APP] ℹ️ INFO: Sin resultados aún (estado inicial o búsqueda sin resultados)');
    }
    return combined;
  }, [resultados, allResultados, matchedLicitaciones, analyzedLicitaciones, discardedIds]);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [toast, setToast] = useState(null);

  // NEW: flag para saber si el loading fue disparado por "buscar" (no por paginación)
  const [searching, setSearching] = useState(false);
  const [fromAutoPreferences, setFromAutoPreferences] = useState(false); // 🆕 Marca si la búsqueda es desde preferencias automáticas
  const [preferredKeywords, setPreferredKeywords] = useState(null); // 🆕 Palabras clave preferidas del usuario
  const [showingMatched, setShowingMatched] = useState(false); // 🆕 Flag para saber si estamos mostrando licitaciones aptas
  const hasInitialized = useRef(false); // 🆕 Flag para ejecutar auto-búsqueda solo UNA VEZ
  const queryStringRef = useRef(""); // 🔧 FIX: Mantener lastQuery estable durante paginación automática
  const lastAnalyzedIdsKeyRef = useRef(""); // Evita recargar análisis con el mismo set de IDs
  
  // 🔧 FIX: Actualizar queryStringRef cuando `lastQuery` proveniente del hook cambia
  // Esto impide que se recalcule dinámicamente durante paginación automática
  useEffect(() => {
    if (lastQuery && typeof lastQuery === 'object') {
      // Es una búsqueda real (objeto con parámetros)
      queryStringRef.current = JSON.stringify(lastQuery);
      // Nueva búsqueda: permitir recargar análisis previos para el nuevo set de IDs
      lastAnalyzedIdsKeyRef.current = "";
      console.log('[APP] 🔍 Nueva búsqueda registrada:', queryStringRef.current);
    } else if (!lastQuery && (analyzedLicitaciones?.length > 0 || matchedLicitaciones?.length > 0)) {
      // No hay búsqueda en curso pero hay datos de BD
      // Mantener el queryString anterior sin cambiar
      console.log('[APP] 📦 Usando datos de BD, mantiendo queryString anterior');
    }
  }, [lastQuery, analyzedLicitaciones, matchedLicitaciones]);
  
  const handleBuscar = async (...args) => {
    setSearching(true);
    setFromAutoPreferences(false); // Limpiar flag cuando busca manualmente
    const termino = typeof args[0] === 'string' ? args[0].trim() : '';
    setPreferredKeywords(termino ? termino.split(',').map(p => p.trim()).filter(Boolean) : null);
    try {
      await buscar(...args);
    } finally {
      setSearching(false);
    }
  };

  const abrirModal = useCallback((item) => { 
    setSelectedItem(item); 
    setModalOpen(true); 
  }, []);

  const cerrarModal = useCallback(() => { 
    setModalOpen(false); 
    setSelectedItem(null); 
  }, []);
  
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);
  
  // 🆕 Cargar preferencias guardadas y buscar automáticamente (DEFINIDO ANTES de usarlo)
  const cargarPreferenciasYBuscar = useCallback(async () => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE || 'http://localhost:5000';
      
      console.log('[APP] 1️⃣ Intentando cargar preferencias desde:', `${API_BASE}/subscriptions/me/preferences`);
      
      // IMPORTANTE: Limpiar el caché primero para NO mostrar última búsqueda
      console.log('[APP] 2️⃣ Limpiando caché de búsqueda anterior...');
      limpiar();
      
      const response = await fetch(`${API_BASE}/subscriptions/me/preferences`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('[APP] 3️⃣ Respuesta del servidor:', response.status);
      
      if (!response.ok) {
        console.warn('[APP] ⚠️ Error en la respuesta:', response.status, response.statusText);
        return;
      }
      
      const data = await response.json();
      console.log('[APP] 4️⃣ Datos recibidos:', data);
      
      if (data.ok && data.palabras_clave) {
        // Dividir palabras clave y mostrar
        const palabrasArray = data.palabras_clave.split(',').map(p => p.trim()).filter(p => p);
        console.log('[APP]  Preferencias encontradas:', {
          total: palabrasArray.length,
          palabras: palabrasArray
        });
        
        if (palabrasArray.length > 1) {
          console.log(`[APP] Buscando automáticamente licitaciones en ${palabrasArray.length} categorías: ${palabrasArray.join(', ')}`);
        } else {
          console.log(`[APP] Buscando automáticamente licitaciones con: ${data.palabras_clave}`);
        }
        
        // 🆕 Guardar palabras clave preferidas para filtrar resultados después
        setPreferredKeywords(palabrasArray);
        
        // Marcar que es una búsqueda automática desde preferencias
        setFromAutoPreferences(true);
        
        // Disparar búsqueda automática
        // buscar() espera: (termino, fechaPubDesde, fechaPubHasta, fechaManifDesde, fechaManifHasta, fechaRecDesde, fechaRecHasta, ciudad, departamento, fase, estado)
        setSearching(true);
        await buscar(
          data.palabras_clave,  // termino
          undefined,            // fechaPubDesde
          undefined,            // fechaPubHasta
          undefined,            // fechaManifDesde
          undefined,            // fechaManifHasta
          undefined,            // fechaRecDesde
          undefined,            // fechaRecHasta
          data.ciudad,          // ciudad
          data.departamento,    // departamento
          undefined,            // fase
          undefined             // estado
        );
        setSearching(false);
      } else {
        console.log('[APP] ❌ No hay preferencias guardadas. Mostrando pantalla vacía.');
      }
    } catch (error) {
      console.error('[APP] ❌ Error cargando preferencias:', error);
    }
  }, [limpiar, buscar]);

  // 🗑️ NUEVO: Cargar licitaciones descartadas al iniciar
  useEffect(() => {
    if (ready && user) {
      console.log('[APP] 🗑️  Cargando licitaciones descartadas...');
      loadDiscarded();
    }
  }, [ready, user]); // ⚠️ NO incluir loadDiscarded para evitar loops
  
  // ✅ NUEVO: Cargar licitaciones aptas (que CUMPLEN) al iniciar
  useEffect(() => {
    if (ready && user) {
      console.log('[APP] ✅ Cargando licitaciones aptas que CUMPLEN requisitos...');
      loadMatched();
    }
  }, [ready, user]); // ⚠️ NO incluir loadMatched para evitar loops
  
  // 📦 Cargar análisis previos cuando hay resultados nuevos de SECOP
  // Esto permite mostrar análisis existentes instántáneamente sin esperar re-análisis
  // 🔧 MEJORADO: Ahora intenta cargar TODOS los análisis previos (no solo los aptos)
  useEffect(() => {
    const baseSecopResults = allResultados && allResultados.length > 0 ? allResultados : resultados;

    if (!baseSecopResults || baseSecopResults.length === 0) {
      // Cuando no hay resultados visibles (limpiar/nueva búsqueda), liberar dedupe para próximos IDs.
      lastAnalyzedIdsKeyRef.current = "";
      return;
    }

    if (ready && user && baseSecopResults && baseSecopResults.length > 0) {
      // Extraer IDs de los resultados
      const ids = baseSecopResults
        .map(r => r.ID_Portafolio || r.id_del_portafolio)
        .filter(Boolean);
      
      if (ids.length > 0) {
        const idsKey = Array.from(new Set(ids)).sort().join(',');
        if (lastAnalyzedIdsKeyRef.current === idsKey) {
          return;
        }
        lastAnalyzedIdsKeyRef.current = idsKey;

        console.log(`[APP] 📦 Buscando análisis PREVIOS para ${ids.length} licitaciones de SECOP...`);
        // 🔧 CAMBIO: Cargar TODOS los análisis previos (completados), no solo los aptos
        loadAnalyzed(false, ids);  // false = no filtrar solo aptos, traer TODOS los completados
      }
    }
  }, [resultados, allResultados, ready, user, loadAnalyzed]);
  
  // 📦 Cargar licitaciones APTAS (MATCHED) filtrando por palabra clave
  // 🆕 Se ejecuta cuando hay búsqueda activa para mostrar solo los aptos relevantes
  useEffect(() => {
    if (ready && user && lastQuery && lastQuery.palabras_clave) {
      console.log(`[APP] 📦 Cargando licitaciones aptas filtrando por: "${lastQuery.palabras_clave}"`);
      loadMatched(lastQuery.palabras_clave);
    }
  }, [ready, user, lastQuery, loadMatched]);
  
    // 🔧 FUERZA LOG CUANDO LLEGAN DATOS DE BD
  useEffect(() => {
    if (analyzedLicitaciones.length > 0) {
      console.log(`[APP] ✅ DATOS DE BD CARGADOS - Analyzed: ${analyzedLicitaciones.length}, Matched: ${matchedLicitaciones.length}`);
      console.log(`[APP] 🎯 memoizedResults ahora tiene ${memoizedResults?.length || 0} items`);
    }
  }, [analyzedLicitaciones.length, matchedLicitaciones.length, memoizedResults?.length]);
    // �🚫 DESHABILITADO: No cargar licitaciones guardadas al iniciar
  
  // 🆕 AUTO-BUSCAR: Ejecutar UNA SOLA VEZ al montar el componente
  useEffect(() => {
    if (!ready || !user || hasInitialized.current) return;
    
    hasInitialized.current = true; // ✅ Marca que ya se ejecutó
    
    const searchParams = new URLSearchParams(location.search);
    const q = searchParams.get('q');
    const departamento = searchParams.get('departamento');
    const ciudad = searchParams.get('ciudad');
    
    console.log('[APP] ⚡ Iniciando App.jsx - checking URL params:', { q, departamento, ciudad });
    
    if (q) {
      // ✅ Si hay parámetros en URL, es que viene desde guardar preferencias
      console.log('[APP] ✅ Auto-búsqueda desde preferencias guardadas:', { q, departamento, ciudad });
      
      // IMPORTANTE: Limpiar el caché primero para NO mostrar última búsqueda
      console.log('[APP] Limpiando caché de búsqueda anterior...');
      limpiar();
      
      // Construir objeto de búsqueda
      const searchQuery = {
        q: q,
        departamento: departamento || undefined,
        ciudad: ciudad || undefined
      };
      console.log('[APP] ✅ Parámetros de búsqueda:', searchQuery);
      
      // 🆕 Guardar palabras clave preferidas para filtrar resultados después
      const palabrasArray = q.split(',').map(p => p.trim()).filter(p => p);
      setPreferredKeywords(palabrasArray);
      
      // Marcar que es una búsqueda automática desde preferencias
      setFromAutoPreferences(true);
      
      // Disparar búsqueda automática
      // buscar() espera: (termino, fechaPubDesde, fechaPubHasta, fechaManifDesde, fechaManifHasta, fechaRecDesde, fechaRecHasta, ciudad, departamento, fase, estado)
      setSearching(true);
      buscar(
        q,                  // termino (palabras clave)
        undefined,          // fechaPubDesde
        undefined,          // fechaPubHasta
        undefined,          // fechaManifDesde
        undefined,          // fechaManifHasta
        undefined,          // fechaRecDesde
        undefined,          // fechaRecHasta
        ciudad,             // ciudad
        departamento,       // departamento
        undefined,          // fase
        undefined           // estado
      ).finally(() => setSearching(false));
      
      // Limpiar parámetros de URL para evitar búsquedas repetidas
      window.history.replaceState({}, document.title, '/app');
    } else {
      // Si NO hay parámetros, cargar preferencias y buscar automáticamente
      console.log('[APP] ℹ️ Cargando preferencias y buscando automáticamente...');
      cargarPreferenciasYBuscar();
    }
  }, [ready, user, buscar, cargarMisLicitaciones, limpiar]);
  
  // 1) Splash a pantalla completa mientras el contexto Auth se inicializa
  if (!ready) return <SplashScreen text="Validando sesión…" />;

  // 2) Splash visible cada vez que comienza una búsqueda (sin limpiar filtros)
  //    - Solo se activa cuando el loading viene de handleBuscar (no de goPage)
  //    - 🆕 NO mostrar splash si ya hay items de BD listos para mostrar
  const showSplash = loading && searching && memoizedResults.length === 0;

  return (
    <div className="min-h-screen main-bg relative">
      {showSplash && <SplashScreen text={lastQuery ? `Buscando proyectos…` : "Cargando resultados…"} />}

      {console.log('[APP.JSX RENDER]', { memoizedResults: memoizedResults?.length || 0, SECOP: resultados?.length || 0, matched: matchedLicitaciones?.length || 0, analyzed: analyzedLicitaciones?.length || 0 })}

      <Header chips={chips} onBuscar={handleBuscar} onLimpiar={limpiar} />

      {ready && user && (
        <WelcomeToast text={`Bienvenido de nuevo, ${user.name || user.email} 👋`} />
      )}

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* 🔧 LOG: Verificar qué se pasa a ResultsPanel */}
      {memoizedResults && console.log('[APP] 📤 PASANDO A RESULTSPANEL:', memoizedResults.length, 'items')}
      
      <ResultsPanel
        // 🗑️ NUEVO: Filtrar descartados de los resultados
        // 📦 JERARQUÍA: Si hay resultados de búsqueda → usarlos
        //               Si no → usar licitaciones analizadas (todas) 
        //               Si no hay analizadas → usar matched (solo aptas)
        resultados={memoizedResults && memoizedResults.length > 0 ? memoizedResults : []}
        loading={loading}
        error={error || errorAnalyzed || errorMatched}
        total={Math.max(0, (total || analyzedLicitaciones.length || matchedLicitaciones.length) - discardedIds.size)}
        limit={limit}
        offset={offset}
        lastQuery={queryStringRef.current}
        isFromCache={!resultados || resultados.length === 0 ? true : (isFromCache && !fromAutoPreferences)}
        onPage={goPage}
        onItemClick={abrirModal}
        onDiscard={discardLicitacion}  // 🗑️ NUEVO: Handler para descartar
        discardedIds={discardedIds}  // 🗑️ NUEVO: IDs de licitaciones descartadas
        isDiscarded={isDiscarded}  // 🗑️ NUEVO: Función para verificar si está descartada
        preferredKeywords={preferredKeywords}
        showingMatched={!resultados || resultados.length === 0}
        analysisStatus={analysisStatus}  // 🆕 Pasar analysisStatus desde App
        isPolling={isPolling}  // 🆕 Pasar isPolling desde App
        allResultados={allResultados}  // 🆕 Pasar allResultados para mostrar total a analizar
        resumen={resumen}  // 🆕 Pasar resumen con contadores
        paginationStatus={paginationStatus}  // 🆕 Pasar información de paginación
      />

      <ResultModal 
        key={selectedItem?.ID_Portafolio || selectedItem?.id_del_portafolio || 'no-item'} 
        open={modalOpen} 
        item={selectedItem} 
        onClose={cerrarModal} 
        analysisStatus={analysisStatus}
      />
    </div>
  );
}
