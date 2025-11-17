/**
 * Componente de navegación superior
 */
export const Navbar = () => {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 glass-effect"
      role="navigation"
      aria-label="Navegación principal"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Título */}
          <div className="flex-shrink-0">
            <h1 className="text-xl font-bold text-white">AirPods 3D</h1>
          </div>

          {/* Links de navegación */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <a
                href="#hero"
                className="text-gray-300 hover:text-white smooth-transition text-sm font-medium"
              >
                Inicio
              </a>
              <a
                href="#features"
                className="text-gray-300 hover:text-white smooth-transition text-sm font-medium"
              >
                Características
              </a>
              <a
                href="#gallery"
                className="text-gray-300 hover:text-white smooth-transition text-sm font-medium"
              >
                Galería
              </a>
              <a
                href="#cta"
                className="bg-accent hover:bg-accent/80 text-white px-4 py-2 rounded-full smooth-transition text-sm font-medium"
              >
                Comprar
              </a>
            </div>
          </div>

          {/* Botón móvil */}
          <div className="md:hidden">
            <button
              className="text-gray-300 hover:text-white"
              aria-label="Menú de navegación"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
