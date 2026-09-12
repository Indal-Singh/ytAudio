"use client";

import { useEffect, useRef } from "react";

interface ModalStates {
  showVisualizer: boolean;
  setShowVisualizer: (v: boolean | ((prev: boolean) => boolean)) => void;
  showDirectModal: boolean;
  setShowDirectModal: (v: boolean | ((prev: boolean) => boolean)) => void;
  showQueueDrawer: boolean;
  setShowQueueDrawer: (v: boolean | ((prev: boolean) => boolean)) => void;
  showVideoModal: boolean;
  setShowVideoModal: (v: boolean | ((prev: boolean) => boolean)) => void;
  showDownloadModal: boolean;
  setShowDownloadModal: (v: boolean | ((prev: boolean) => boolean)) => void;
  showFullscreenPlayer: boolean;
  setShowFullscreenPlayer: (v: boolean | ((prev: boolean) => boolean)) => void;
  showSponsorModal?: boolean;
  setShowSponsorModal?: (v: boolean | ((prev: boolean) => boolean)) => void;
}

/**
 * Manages browser & mobile hardware Back button navigation for all modals and drawers.
 * Intercepts popstate so pressing 'Back' closes the active modal rather than navigating away or exiting the app.
 */
export function usePlayerBackHandler(modals: ModalStates) {
  const {
    showVisualizer,
    setShowVisualizer,
    showDirectModal,
    setShowDirectModal,
    showQueueDrawer,
    setShowQueueDrawer,
    showVideoModal,
    setShowVideoModal,
    showDownloadModal,
    setShowDownloadModal,
    showFullscreenPlayer,
    setShowFullscreenPlayer,
    showSponsorModal = false,
    setShowSponsorModal,
  } = modals;

  const activeModalRef = useRef<string | null>(null);
  const isPopstateRef = useRef(false);

  const syncModal = (modalName: string, isOpen: boolean) => {
    if (typeof window === "undefined") return;

    if (isOpen) {
      if (activeModalRef.current !== modalName) {
        activeModalRef.current = modalName;
        window.history.pushState({ isModal: true, modal: modalName }, "");
      }
    } else {
      if (activeModalRef.current === modalName) {
        activeModalRef.current = null;
        // If closed via UI (not via back button popstate), step back in history to keep stack clean
        if (!isPopstateRef.current && window.history.state?.isModal) {
          window.history.back();
        }
      }
    }
  };

  useEffect(() => {
    syncModal("visualizer", showVisualizer);
  }, [showVisualizer]);

  useEffect(() => {
    syncModal("direct", showDirectModal);
  }, [showDirectModal]);

  useEffect(() => {
    syncModal("queue", showQueueDrawer);
  }, [showQueueDrawer]);

  useEffect(() => {
    syncModal("video", showVideoModal);
  }, [showVideoModal]);

  useEffect(() => {
    syncModal("download", showDownloadModal);
  }, [showDownloadModal]);

  useEffect(() => {
    syncModal("fullscreen", showFullscreenPlayer);
  }, [showFullscreenPlayer]);

  useEffect(() => {
    syncModal("sponsor", showSponsorModal);
  }, [showSponsorModal]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = (e: PopStateEvent) => {
      if (activeModalRef.current) {
        isPopstateRef.current = true;
        const current = activeModalRef.current;
        activeModalRef.current = null;

        if (current === "visualizer") setShowVisualizer(false);
        else if (current === "direct") setShowDirectModal(false);
        else if (current === "queue") setShowQueueDrawer(false);
        else if (current === "video") setShowVideoModal(false);
        else if (current === "download") setShowDownloadModal(false);
        else if (current === "fullscreen") setShowFullscreenPlayer(false);
        else if (current === "sponsor" && setShowSponsorModal) setShowSponsorModal(false);

        setTimeout(() => {
          isPopstateRef.current = false;
        }, 80);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [
    setShowVisualizer,
    setShowDirectModal,
    setShowQueueDrawer,
    setShowVideoModal,
    setShowDownloadModal,
    setShowFullscreenPlayer,
    setShowSponsorModal,
  ]);
}
