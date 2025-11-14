import React from 'react';
import { useNavigate } from 'react-router-dom';

interface NoAccessProps {
  onLogout?: () => void;
}

const NoAccess: React.FC<NoAccessProps> = ({ onLogout }) => {
  const navigate = useNavigate();

  const handleReturnToLogin = React.useCallback(() => {
    if (onLogout) {
      onLogout();
    }

    navigate('/login', { replace: true });
  }, [navigate, onLogout]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold text-gray-900">Acceso no autorizado</h1>
        <p className="text-base text-gray-600">
          Tu rol no tiene ninguna página disponible en este momento. Contacta a un administrador
          o regresa a la pantalla de inicio de sesión.
        </p>
      </div>
      <button
        type="button"
        onClick={handleReturnToLogin}
        className="rounded-md bg-brand-primary px-6 py-3 text-white transition hover:bg-brand-primary/90 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
      >
        Volver al inicio de sesión
      </button>
    </div>
  );
};

export default NoAccess;
