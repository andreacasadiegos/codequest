import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth.js';
import { advancePath } from '../../services/gamificationService.js';
import Alert from '../ui/Alert.jsx';
import ProgressBar from '../ui/ProgressBar.jsx';

/**
 * Avance de ruta básica a intermedia (RF-31): muestra el mejor puntaje en
 * cada evaluación y el promedio. El botón solo se habilita si se cumple
 * la regla, y el servidor la vuelve a comprobar.
 */
export default function PathAdvanceCard({ status, onAdvanced }) {
  const { refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  const handleAdvance = async () => {
    setSaving(true);
    setError('');
    try {
      await advancePath();
      await refreshUser();
      onAdvanced();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className={`cq-card cq-advance-card p-4 ${status.eligible ? 'is-eligible' : ''}`}>
      <div className="d-flex flex-column flex-md-row gap-3 align-items-md-center mb-3">
        <span className="cq-icon-soft"><i className="bi bi-signpost-2-fill" aria-hidden="true" /></span>
        <div className="flex-grow-1">
          <h2 className="h5 fw-bold mb-1">
            {status.eligible ? `¡Puedes avanzar a la ${status.target.name.toLowerCase()}!` : `Avanza a la ${status.target.name.toLowerCase()}`}
          </h2>
          <p className="cq-muted small mb-0">
            Aprueba las 3 evaluaciones de módulo con un promedio de {status.required_pct}% o más.
          </p>
        </div>
        <div className="text-md-end">
          <p className="cq-muted small mb-0">Tu promedio</p>
          <p className="h3 fw-bold mb-0">{status.average}%</p>
        </div>
      </div>

      <ProgressBar value={status.average} label="Promedio de las evaluaciones" />

      <ul className="cq-advance-list list-unstyled mt-3 mb-0">
        {status.evaluations.map((evaluation) => (
          <li key={evaluation.activity_id}>
            <i
              className={`bi ${evaluation.passed ? 'bi-check-circle-fill text-success' : 'bi-circle cq-muted'}`}
              aria-hidden="true"
            />
            <Link
              className="cq-advance-evaluation flex-grow-1"
              to={evaluation.locked ? `/modulos/${evaluation.module_slug}` : `/actividades/${evaluation.activity_id}`}
              aria-label={evaluation.locked
                ? `Ir al módulo ${evaluation.module_name} para completar las lecciones antes de la evaluación`
                : `${evaluation.passed ? 'Volver a intentar' : 'Resolver'} la evaluación de ${evaluation.module_name}`}
            >
              <span className="cq-advance-evaluation-name">Evaluación de {evaluation.module_name}</span>
              <span className="cq-muted small">
                {evaluation.locked
                  ? 'Completa las lecciones para desbloquear'
                  : evaluation.passed ? 'Volver a intentar' : 'Resolver evaluación'}
              </span>
            </Link>
            <span className="fw-semibold">
              {evaluation.best_score === null ? 'Sin intentos' : `${evaluation.best_score}%`}
            </span>
            <i className="bi bi-arrow-right cq-advance-evaluation-arrow" aria-hidden="true" />
          </li>
        ))}
      </ul>

      <Alert>{error}</Alert>

      {status.eligible && (
        <div className="mt-3">
          {confirming ? (
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <span className="small">Conservas tu XP e insignias y verás las lecciones de la nueva ruta. ¿Continuar?</span>
              <button type="button" className="btn btn-cq btn-cq-primary" onClick={handleAdvance} disabled={saving}>
                {saving ? 'Cambiando…' : 'Sí, avanzar'}
              </button>
              <button type="button" className="btn btn-cq btn-cq-outline" onClick={() => setConfirming(false)} disabled={saving}>
                Ahora no
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-cq btn-cq-primary" onClick={() => setConfirming(true)}>
              Avanzar a la {status.target.name.toLowerCase()} <i className="bi bi-arrow-up-right" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
