import React, { useState, useCallback, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import Header from "../components/Header.jsx";
import ResultsPanel from "../components/ResultsPanel.jsx";
import ResultModal from "../components/ResultModal.jsx";
import { useSearchResults } from "../features/hooks.js";
import { useDiscardedLicitaciones } from "../hooks/useDiscardedLicitaciones.js";  // 🗑️ NUEVO
import { useMatchedLicitaciones } from "../hooks/useMatchedLicitaciones.js";
import { useAnalyzedLicitaciones } from "../hooks/useAnalyzedLicitaciones.js";  // 📦 NUEVO - Carga de BD local
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

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [toast, setToast] = useState(null);

  // NEW: flag para saber si el loading fue disparado por "buscar" (no por paginación)
  const [searching, setSearching] = useState(false);
  const [fromAutoPreferences, setFromAutoPreferences] = useState(false); // 🆕 Marca si la búsqueda es desde preferencias automáticas
  const [preferredKeywords, setPreferredKeywords] = useState(null); // 🆕 Palabras clave preferidas del usuario
  const [showingMatched, setShowingMatched] = useState(false); // 🆕 Flag para saber si estamos mostrando licitaciones aptas
  const hasInitialized = useRef(false); // 🆕 Flag para ejecutar auto-búsqueda solo UNA VEZ
  
  // 🆕 Función para normalizar datos de BD a estructura de ResultCard
  const normalizeFromDB = (item) => {
    if (!item) return item;
    
    // 🆕 Extraer referencia de detalles si existe
    let referencia = item.id_portafolio; // Por defecto usar id_portafolio
    try {
      if (item.detalles && typeof item.detalles === 'object') {
        // Buscar el campo de referencia en detalles
        const refs = Object.values(item.detalles)
          .filter(v => typeof v === 'string' && v.length > 0);
        if (refs.length > 0) {
          referencia = refs[0]; // Usar el primer valor encontrado
        }
      }
    } catch (e) {
      console.log('[APP] Usando id_portafolio como referencia:', item.id_portafolio);
    }
    
    const normalized = {
      ...item,
      // Normalizar campos de ID
      ID_Portafolio: item.id_portafolio || item.ID_Portafolio,
      id_del_portafolio: item.id_portafolio || item.id_del_portafolio,
      // Normalizar campo de referencia
      Referencia_del_proceso: referencia || item.Referencia_del_proceso,
      // Normalizar entidad - buscar en detalles o usar default
      Entidad: item.entidad || item.Entidad || 'Entidad no disponible',
      // Normalizar precio
      Precio_base: item.precio || item.Precio_base,
      // Agregar URL si existe
      URL_Proceso: item.enlace || item.URL_Proceso || '#',
      // 🆕 Agregar score (porcentaje) para cards
      score: item.porcentaje !== null && item.porcentaje !== undefined ? item.porcentaje : 0,
      // 🆕 Agregar requisitos_extraidos si no existe
      requisitos_extraidos: item.requisitos_extraidos || item.requisitos || {},
    };
    
    console.log('[APP] 📋 Licitación normalizada:', normalized.ID_Portafolio, 'Ref:', normalized.Referencia_del_proceso, 'Score:', normalized.score);
    return normalized;
  };
  
  const handleBuscar = async (...args) => {
    setSearching(true);
    setFromAutoPreferences(false); // Limpiar flag cuando busca manualmente
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
        console.log('[APP] ✅ Preferencias encontradas:', {
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
  
  // � NUEVO: Cargar licitaciones ANALIZADAS desde BD local al iniciar
  useEffect(() => {
    if (ready && user) {
      console.log('[APP] 📦 Cargando licitaciones analizadas desde BD local (sin API)...');
      loadAnalyzed(false); // false = cargar todas (cumplen y no cumplen)
    }
  }, [ready, user]); // ⚠️ NO incluir loadAnalyzed para evitar loops
  
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
  const showSplash = loading && searching;

  return (
    <div className="min-h-screen main-bg relative">
      {showSplash && <SplashScreen text={lastQuery ? `Buscando proyectos…` : "Cargando resultados…"} />}

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

      <ResultsPanel
        // 🗑️ NUEVO: Filtrar descartados de los resultados
        // 📦 JERARQUÍA: Si hay resultados de búsqueda → usarlos
        //               Si no → usar licitaciones analizadas (todas) 
        //               Si no hay analizadas → usar matched (solo aptas)
        resultados={
          (() => {
            if (!resultados || resultados.length === 0) {
              if (analyzedLicitaciones && analyzedLicitaciones.length > 0) {
                const normalized = analyzedLicitaciones
                  .filter(r => !isDiscarded(r.id_portafolio))
                  .map(normalizeFromDB);
                console.log('[APP] 🎯 Mostrando ANALIZADAS desde BD local:', normalized.length);
                return normalized;
              } else {
                const normalized = matchedLicitaciones.map(normalizeFromDB);
                console.log('[APP] 🎯 Mostrando MATCHED (aptas):', normalized.length);
                return normalized;
              }
            }
            return resultados.filter(r => !isDiscarded(r.ID_Portafolio || r.id_del_portafolio));
          })()
        }
        loading={loading || loadingAnalyzed || loadingMatched}
        error={error || errorAnalyzed || errorMatched}
        total={Math.max(0, (total || analyzedLicitaciones.length || matchedLicitaciones.length) - discardedIds.size)}
        limit={limit}
        offset={offset}
        lastQuery={
          lastQuery || 
          (!resultados || resultados.length === 0 
            ? (analyzedLicitaciones && analyzedLicitaciones.length > 0
                ? 'Licitaciones analizadas (desde BD local)'
                : 'Licitaciones aptas guardadas')
            : '')
        }
        isFromCache={!resultados || resultados.length === 0 ? true : (isFromCache && !fromAutoPreferences)}
        onPage={goPage}
        onItemClick={abrirModal}
        onDiscard={discardLicitacion}  // 🗑️ NUEVO: Handler para descartar
        discardedIds={discardedIds}  // 🗑️ NUEVO: IDs de licitaciones descartadas
        isDiscarded={isDiscarded}  // 🗑️ NUEVO: Función para verificar si está descartada
        preferredKeywords={preferredKeywords}
        showingMatched={!resultados || resultados.length === 0}
      />

      <ResultModal 
        key={selectedItem?.ID_Portafolio || selectedItem?.id_del_portafolio || 'no-item'} 
        open={modalOpen} 
        item={selectedItem} 
        onClose={cerrarModal} 
      />
    </div>
  );
}
