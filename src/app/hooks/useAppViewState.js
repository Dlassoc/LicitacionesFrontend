import { useState, useCallback, useRef } from 'react';

export function useAppViewState({ buscar }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [searching, setSearching] = useState(false);
  const [fromAutoPreferences, setFromAutoPreferences] = useState(false);
  const [preferredKeywords, setPreferredKeywords] = useState(null);

  const hasInitialized = useRef(false);
  const queryStringRef = useRef('');
  const lastAnalyzedIdsKeyRef = useRef('');

  const handleBuscar = useCallback(async (...args) => {
    setSearching(true);
    setFromAutoPreferences(false);
    const termino = typeof args[0] === 'string' ? args[0].trim() : '';
    setPreferredKeywords(termino ? termino.split(',').map(p => p.trim()).filter(Boolean) : null);
    try {
      await buscar(...args);
    } finally {
      setSearching(false);
    }
  }, [buscar]);

  const abrirModal = useCallback(item => {
    setSelectedItem(item);
    setModalOpen(true);
  }, []);

  const cerrarModal = useCallback(() => {
    setModalOpen(false);
    setSelectedItem(null);
  }, []);

  return {
    modalOpen,
    selectedItem,
    toast,
    searching,
    fromAutoPreferences,
    preferredKeywords,
    setToast,
    setSearching,
    setFromAutoPreferences,
    setPreferredKeywords,
    hasInitialized,
    queryStringRef,
    lastAnalyzedIdsKeyRef,
    handleBuscar,
    abrirModal,
    cerrarModal,
  };
}
