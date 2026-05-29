export default function Footer() {
  return (
    <footer className="bg-slate-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-peru-red rounded-lg flex items-center justify-center">
                <i className="fas fa-landmark text-white text-sm" />
              </div>
              <span className="font-heading font-bold">Convocatorias Perú</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              Centralizamos las convocatorias del Estado peruano para que encuentres tu empleo público más rápido y fácil.
            </p>
          </div>

          <div>
            <h4 className="font-heading font-600 text-sm uppercase tracking-wider text-slate-300 mb-4">Plataforma</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="#convocatorias" className="hover:text-white transition-colors">Convocatorias</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Asistente IA</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Mi Panel</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-600 text-sm uppercase tracking-wider text-slate-300 mb-4">Recursos</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><a href="#" className="hover:text-white transition-colors">Guía para postular</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Tipos de contrato</a></li>
              <li><a href="#" className="hover:text-white transition-colors">SERVIR</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-heading font-600 text-sm uppercase tracking-wider text-slate-300 mb-4">Contacto</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <i className="fas fa-envelope mr-2 text-peru-red" />
                convocape.soporte@gmail.com
              </li>
              <li>
                <i className="fas fa-phone mr-2 text-peru-red" />
                (01) 234-5678
              </li>
            </ul>
            <div className="flex gap-3 mt-4">
              <a href="https://www.facebook.com/profile.php?id=61590101289105" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-9 h-9 rounded-lg bg-white/10 hover:bg-peru-red flex items-center justify-center transition-colors">
                <i className="fab fa-facebook-f text-sm" />
              </a>
              <a href="#" aria-label="Twitter" className="w-9 h-9 rounded-lg bg-white/10 hover:bg-peru-red flex items-center justify-center transition-colors">
                <i className="fab fa-twitter text-sm" />
              </a>
              <a href="#" aria-label="LinkedIn" className="w-9 h-9 rounded-lg bg-white/10 hover:bg-peru-red flex items-center justify-center transition-colors">
                <i className="fab fa-linkedin-in text-sm" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-xs">&copy; 2025 Convocatorias Perú. Todos los derechos reservados.</p>
          <p className="text-slate-500 text-xs">Datos actualizados desde fuentes públicas del Estado Peruano</p>
        </div>
      </div>
    </footer>
  )
}
