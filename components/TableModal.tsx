import React, { useEffect, useMemo, useState } from 'react';
import Modal from './Modal';

export type TableFormValues = {
  nom: string;
  capacite: number;
  couverts?: number;
};

interface TableModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  initialValues?: Partial<TableFormValues>;
  onSubmit: (values: TableFormValues) => Promise<void>;
  showCouvertsField?: boolean;
}

type FieldErrors = Partial<Record<'nom' | 'capacite' | 'couverts', string>>;

const defaultFormState = { nom: '', capacite: '', couverts: '' } as const;

const TableModal: React.FC<TableModalProps> = ({
  isOpen,
  onClose,
  mode,
  initialValues,
  onSubmit,
  showCouvertsField = false,
}) => {
  const [formState, setFormState] = useState<typeof defaultFormState>(defaultFormState);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modalTitle = useMemo(
    () => (mode === 'create' ? 'Agregar una mesa' : 'Editar la mesa'),
    [mode],
  );

  useEffect(() => {
    if (!isOpen) {
      setFormState(defaultFormState);
      setFieldErrors({});
      setSubmitError(null);
      setIsSubmitting(false);
      return;
    }

    const nextState = {
      nom: initialValues?.nom ?? '',
      capacite: initialValues?.capacite ? String(initialValues.capacite) : '',
      couverts:
        showCouvertsField && initialValues?.couverts !== undefined
          ? String(initialValues.couverts)
          : '',
    } as typeof defaultFormState;

    setFormState(nextState);
    setFieldErrors({});
    setSubmitError(null);
  }, [initialValues?.capacite, initialValues?.couverts, initialValues?.nom, isOpen, showCouvertsField]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormState(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    const trimmedName = formState.nom.trim();
    const trimmedCapacity = formState.capacite.trim();

    if (!trimmedName) {
      errors.nom = 'El nombre es obligatorio.';
    }

    let capacityValue: number | null = null;
    if (!trimmedCapacity) {
      errors.capacite = 'La capacidad es obligatoria.';
    } else {
      const parsed = Number(trimmedCapacity);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        errors.capacite = 'La capacidad debe ser un número entero positivo.';
      } else {
        capacityValue = parsed;
      }
    }

    if (showCouvertsField) {
      const trimmedCouverts = formState.couverts.trim();
      if (!trimmedCouverts) {
        errors.couverts = 'El número de cubiertos es obligatorio.';
      } else {
        const parsed = Number(trimmedCouverts);
        if (!Number.isInteger(parsed) || parsed <= 0) {
          errors.couverts = 'Los cubiertos deben ser un número entero positivo.';
        } else if (capacityValue !== null && parsed > capacityValue) {
          errors.couverts = 'Los cubiertos no pueden superar la capacidad.';
        }
      }
    }

    return errors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});
    setSubmitError(null);

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const payload: TableFormValues = {
      nom: formState.nom.trim(),
      capacite: Number(formState.capacite.trim()),
    };

    if (showCouvertsField) {
      const trimmed = formState.couverts.trim();
      if (trimmed) {
        payload.couverts = Number(trimmed);
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit(payload);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Ocurrió un error. Por favor, inténtalo de nuevo.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        {submitError && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <div>
          <label htmlFor="table-name" className="block text-sm font-medium text-gray-700">
            Nombre de la mesa
          </label>
          <input
            id="table-name"
            name="nom"
            type="text"
            className="ui-input mt-1"
            value={formState.nom}
            onChange={handleChange}
            disabled={isSubmitting}
            placeholder="Ej. Terraza 1"
            autoFocus
          />
          {fieldErrors.nom && <p className="mt-1 text-sm text-red-600">{fieldErrors.nom}</p>}
        </div>

        <div>
          <label htmlFor="table-capacity" className="block text-sm font-medium text-gray-700">
            Capacidad (número de puestos)
          </label>
          <input
            id="table-capacity"
            name="capacite"
            type="number"
            min={1}
            className="ui-input mt-1"
            value={formState.capacite}
            onChange={handleChange}
            disabled={isSubmitting}
            placeholder="Ej. 4"
          />
          {fieldErrors.capacite && <p className="mt-1 text-sm text-red-600">{fieldErrors.capacite}</p>}
        </div>

        {showCouvertsField && (
          <div>
              <label htmlFor="table-couverts" className="block text-sm font-medium text-gray-700">
                Cubiertos (actuales)
              </label>
            <input
              id="table-couverts"
              name="couverts"
              type="number"
              min={1}
              className="ui-input mt-1"
              value={formState.couverts}
              onChange={handleChange}
              disabled={isSubmitting}
              placeholder="Ej. 2"
            />
            {fieldErrors.couverts && <p className="mt-1 text-sm text-red-600">{fieldErrors.couverts}</p>}
          </div>
        )}

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="w-full ui-btn-secondary py-3"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="w-full ui-btn-primary py-3 disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default TableModal;
