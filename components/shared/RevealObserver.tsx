'use client'
import { useEffect } from 'react'

function observeAll(observer: IntersectionObserver) {
  document.querySelectorAll('.reveal:not([data-observed])').forEach(el => {
    el.setAttribute('data-observed', '1')
    observer.observe(el)
  })
}

export default function RevealObserver() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    observeAll(observer)

    // Detecta nuevas tarjetas al cambiar de página/filtros
    const mutation = new MutationObserver(() => observeAll(observer))
    mutation.observe(document.body, { childList: true, subtree: true })

    return () => { observer.disconnect(); mutation.disconnect() }
  }, [])

  return null
}
