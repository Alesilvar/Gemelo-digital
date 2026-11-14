import { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { commonFields, dateTime, displayValue, sensorByType, sensorTime, type SessionMessage } from './data';

export interface Selection { type: string; field?: string; message?: SessionMessage }
export default function Detail({ selection, messages, latest, onChange, onClose }: { selection: Selection; messages: SessionMessage[]; latest?: SessionMessage; onChange: (message: SessionMessage | undefined) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const sensor = sensorByType(selection.type);
  const message = selection.message ?? latest;
  const fields = [...commonFields, ...(sensor?.fields ?? [])];
  const records = messages.filter(m => m.type === selection.type);
  const index = message ? records.findIndex(m => m.id === message.id) : -1;
  const title = sensor?.fields.find(f => f.key === selection.field)?.label ?? sensor?.label ?? (selection.type === 'gateway' ? 'Estado del gateway' : selection.type);
  return <dialog ref={dialog} className="detail-dialog" onClose={onClose} aria-labelledby="detail-title">
    <header className="detail-heading"><div><span className="eyebrow">INSPECTOR DE MENSAJES</span><h2 id="detail-title">{title}</h2><p>{sensor ? `${sensor.model} · Nodo ${sensor.node}` : 'Mensaje recibido por MQTT'}</p></div><button className="icon-button" onClick={() => dialog.current?.close()} aria-label="Cerrar detalle"><X /></button></header>
    <div className="detail-scroll">
      <div className="message-navigation"><div><strong>{selection.message ? 'Mensaje seleccionado' : 'Último mensaje recibido'}</strong><span>{index >= 0 ? `${index + 1} de ${records.length} mensajes conservados de este sensor` : 'Sesión actual'}</span></div><div className="button-group"><button className="icon-button" aria-label="Mensaje anterior" disabled={index <= 0} onClick={() => onChange(records[index - 1])}><ArrowLeft size={18} /></button><button className="icon-button" aria-label="Mensaje siguiente" disabled={index < 0 || index >= records.length - 1} onClick={() => onChange(records[index + 1])}><ArrowRight size={18} /></button><button className="secondary-button" onClick={() => onChange(undefined)}>Último</button></div></div>
      {!message ? <div className="empty-state"><strong>Sin datos</strong><p>Este sensor aún no ha enviado mensajes durante la sesión actual.</p></div> : <>
        <dl className="message-meta"><div className="wide"><dt>Tópico MQTT</dt><dd><code>{message.topic}</code></dd></div><div><dt>Recibido en el navegador</dt><dd>{dateTime(message.receivedAt)}</dd></div><div><dt>Hora del gateway</dt><dd>{message.kind === 'gateway' ? 'No incluida en el texto plano' : sensorTime(message.data)}</dd></div><div><dt>Nodo recibido</dt><dd>{displayValue(message.data?.nodo)}</dd></div><div><dt>Secuencia recibida</dt><dd>{displayValue(message.data?.seq)}</dd></div><div><dt>Retenido por el broker</dt><dd>{message.retained ? 'Sí · puede ser anterior a la apertura de la web' : 'No'}</dd></div></dl>
        {message.kind === 'error' && <div className="notice error-notice" role="alert">{message.error} El contenido original se conserva debajo.</div>}
        {message.kind === 'gateway' ? <section className="detail-section"><h3>Estado recibido · texto plano</h3><code>{message.raw}</code><p>El estado del gateway es independiente de la conexión MQTT del navegador.</p></section> : <>
          <section className="detail-section"><h3>Anomalías recibidas del sensor</h3>{message.anomalies.length ? <div className="tags">{message.anomalies.map(a => <span className="tag" key={a}>{a}</span>)}</div> : <p>{message.data?.anomalias === 'NINGUNA' ? 'NINGUNA (valor recibido)' : 'Sin anomalías informadas en un campo válido.'}</p>}<p className="muted">La web no calcula anomalías ni clasifica el aula.</p></section>
          {message.data && <section className="detail-section"><h3>Campos recibidos</h3><div className="table-scroll"><table><thead><tr><th>Campo / medición</th><th>Valor original</th><th>Unidad</th></tr></thead><tbody>{Object.entries(message.data).map(([key, value]) => { const info = fields.find(f => f.key === key); return <tr key={key} className={selection.field === key ? 'highlight-row' : undefined}><td><strong>{info?.label ?? key}</strong><code className="field-key">{key}</code></td><td>{displayValue(value)}{key === 'puerta_abierta' && (value === 0 || value === 1) && <small className="field-key">{value === 0 ? 'Cerrada (0)' : 'Abierta (1)'}</small>}{key === 'co2_ppm' && (value === -1 || value === -2) && <small className="field-key">{value === -1 ? 'Sensor sin respuesta' : 'Checksum inválido'} · no es una concentración</small>}</td><td>{info?.unit || '—'}</td></tr>; })}</tbody></table></div></section>}
        </>}
        <section className="detail-section"><h3>{message.kind === 'gateway' ? 'Mensaje original (texto plano)' : 'JSON original del mensaje'}</h3><pre tabIndex={0}>{message.raw}</pre></section>
      </>}
      <p className="detail-footer">Solo mensajes recibidos en esta sesión. Se pierden al recargar o cerrar la web.</p>
    </div>
  </dialog>;
}
