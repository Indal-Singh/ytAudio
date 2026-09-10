"use client";

import { useEffect } from "react";

export function SsrPreloaderClient() {
  useEffect(() => {
    // Fade out preloader as soon as client is mounted and hydrated
    const preloader = document.getElementById("ssr-preloader");
    if (preloader) {
      preloader.classList.add("loaded");
      const timer = setTimeout(() => {
        if (preloader.parentNode) {
          preloader.parentNode.removeChild(preloader);
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, []);

  return null;
}
