/**
 * Componente de pantalla de carga
 */
export const Loading = () => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="text-center space-y-6">
        {/* Spinner */}
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 border-4 border-white/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>

        {/* Texto */}
        <div className="space-y-2">
          <p className="text-white font-semibold text-lg">Cargando experiencia 3D</p>
          <p className="text-gray-400 text-sm">Preparando el modelo...</p>
        </div>
      </div>
    </div>
  );
};
