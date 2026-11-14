import { useMemo, useState } from 'react';
import { Activity, ArrowDownLeft, ArrowRight, ArrowUpRight, Box, ChevronLeft, ChevronRight, CircleHelp, Clock3, Database, DoorOpen, FileText, FlaskConical, LayoutDashboard, Lightbulb, ListFilter, Network, Pause, Radio, RefreshCw, ShieldCheck, Thermometer, Users, Volume2, Waves, Wifi, Wind } from 'lucide-react';
import { config } from './config';
import { dateTime, displayValue, groups, numberValue, sensors, sensorByType, time, type SensorType, type SessionMessage } from './data';
import { useMqtt } from './useMqtt';
import Chart from './Chart';
import Detail, { type Selection } from './Detail';

const sensorIcons = { termico: Users, magnetico: DoorOpen, co2: Wind, gas: FlaskConical, ambiente: Thermometer, audio: Volume2, luz: Lightbulb };
type View = 'overview' | 'messages' | 'nodes' | 'pending';
const navItems = [{ id: 'overview' as const, label: 'Vista general', icon: LayoutDashboard }, { id: 'messages' as const, label: 'Mensajes de sesión', icon: Database }, { id: 'nodes' as const, label: 'Nodos y conexión', icon: Network }, { id: 'pending' as const, label: 'Por definir', icon: FileText }];
const format = (value: number) => value.toLocaleString('es-PE', { maximumFractionDigits: 2 });

export default function App() {
  const mqtt = useMqtt();
  const [view, setView] = useState<View>('overview');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [sensorFilter, setSensorFilter] = useState('all');
  const [anomalyFilter, setAnomalyFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [chartType, setChartType] = useState<SensorType>('luz');
  const [chartKey, setChartKey] = useState('lux_mesa_est');
  const [windowMinutes, setWindowMinutes] = useState('all');
  const chartSensor = sensorByType(chartType)!;
  const chartField = chartSensor.fields.find(f => f.key === chartKey) ?? chartSensor.fields[0];
  const latest = useMemo(() => {
    const result: Record<string, SessionMessage> = {};
    Object.values(mqtt.latest).forEach(m => { if (!result[m.type] || result[m.type].id < m.id) result[m.type] = m; });
    return result;
  }, [mqtt.latest]);
  const receivedSensors = sensors.filter(s => latest[s.type]).length;
  const anomalies = useMemo(() => [...new Set(mqtt.messages.flatMap(m => m.anomalies))].sort(), [mqtt.messages]);
  const filtered = useMemo(() => mqtt.messages.filter(m =>
    (sensorFilter === 'all' || (sensorFilter === 'errors' ? m.kind === 'error' : m.type === sensorFilter)) &&
    (anomalyFilter === 'all' || (anomalyFilter === 'with' ? m.anomalies.length > 0 : anomalyFilter === 'none' ? m.data?.anomalias === 'NINGUNA' : m.anomalies.includes(anomalyFilter)))
  ).reverse(), [mqtt.messages, sensorFilter, anomalyFilter]);
  const pages = Math.max(1, Math.ceil(filtered.length / 25));
  const currentPage = Math.min(page, pages - 1);
  const chartMessages = mqtt.messages.filter(m => m.kind === 'sensor' && m.type === chartType && (windowMinutes === 'all' || m.receivedAt >= mqtt.now - Number(windowMinutes) * 60000));
  const gateway = latest.gateway;
  const noMessages = mqtt.total === 0;
  const age = mqtt.lastAt === null ? null : Math.max(0, Math.floor((mqtt.now - mqtt.lastAt) / 1000));
  const openMessage = (message: SessionMessage) => setSelection({ type: message.type, message });
  const goto = (target: View) => { setView(target); setPage(0); };
  const statusLabel = mqtt.status.charAt(0).toUpperCase() + mqtt.status.slice(1);

  return <div className="app-shell">
    <a className="skip-link" href="#main">Saltar al contenido</a>
    <aside className="sidebar">
      <a className="brand" href="#" onClick={e => { e.preventDefault(); goto('overview'); }} aria-label="L419, ir a vista general"><span className="brand-mark"><Box size={25} /></span><span>Gemelo digital<small>PROYECTO L419</small></span></a>
      <div className="sidebar-label">ESPACIO DE TRABAJO</div>
      <nav aria-label="Navegación principal">{navItems.map(item => <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => goto(item.id)} aria-current={view === item.id ? 'page' : undefined}><item.icon size={18} /><span>{item.label}</span>{item.id === 'messages' && <small>{mqtt.total}</small>}</button>)}</nav>
      <div className="sidebar-context"><span className="context-icon"><Radio size={19} /></span><strong>Escuchando el aula</strong><p>7 sensores · 1 gateway<br />Lectura MQTT por WebSocket</p><span className="readonly"><ShieldCheck size={13} /> Solo suscripción</span></div>
      <div className="sidebar-bottom"><div className="avatar">L4</div><div><strong>Aula L419</strong><small>Demo de instrumentación</small></div><span className="tiny-dot" /></div>
    </aside>

    <div className="workspace">
      <header className="topbar"><div className="breadcrumb">Proyecto interdisciplinario <span>/</span> <strong>Aula L419</strong></div><div className="topbar-right"><span className="session-indicator"><span className="tiny-dot" /> Sesión actual</span><span className="vertical-divider" /><Clock3 size={14} /><time>{time(mqtt.now)}</time></div></header>
      <main id="main" tabIndex={-1}>
        <div className="page-heading"><div><span className="eyebrow">GEMELO DIGITAL · AULA L419</span><h1>{view === 'overview' ? 'El aula, en tiempo real.' : view === 'messages' ? 'Mensajes de la sesión.' : view === 'nodes' ? 'Nodos y conexión.' : 'Un modelo en construcción.'}</h1><p>{view === 'overview' ? 'Explora las mediciones y los mensajes recibidos del aula.' : view === 'messages' ? 'Inspecciona el contenido original, sin perder el contexto de cada lectura.' : view === 'nodes' ? 'Observa la recepción de cada sensor y el estado del enlace MQTT.' : 'Estos apartados necesitan información del equipo antes de implementarse.'}</p></div><span className="demo-badge"><span /> DEMO EN VIVO</span></div>

        <section className="connection-bar" aria-label="Estado de conexión"><div className={`connection-state ${mqtt.status}`} role="status"><Wifi size={17} /><strong>MQTT {statusLabel.toLowerCase()}</strong></div><span className="connection-topic"><code>{config.topic}</code></span><div className="connection-actions"><button className="text-button" onClick={mqtt.toggle}>{mqtt.enabled ? <Pause size={14} /> : <Radio size={14} />}{mqtt.enabled ? 'Desconectar' : 'Conectar'}</button><button className="icon-button" onClick={mqtt.retry} aria-label="Reintentar conexión MQTT"><RefreshCw size={15} /></button></div></section>
        {mqtt.problem && <div className="notice error-notice" role="status"><CircleHelp size={17} /><span>{mqtt.problem}</span></div>}
        {mqtt.status === 'conectado' && (noMessages || (age !== null && age >= 30)) && <div className="notice" role="status"><Radio size={17} /><span>{noMessages ? 'Suscripción aceptada. Aún no llegan mensajes del grupo; esperando al gateway y a los sensores.' : `No llegan mensajes nuevos desde hace ${age} s. Las lecturas mostradas corresponden a la última recepción.`}</span></div>}

        <div className="stats-strip"><div><span>MENSAJES RECIBIDOS</span><strong>{mqtt.total.toLocaleString('es-PE')}<ArrowDownLeft size={19} /></strong><small>Durante esta sesión</small></div><div><span>SENSORES CON DATOS</span><strong>{receivedSensors}<em>/ 7</em></strong><small>Con al menos un mensaje</small></div><div><span>MENSAJES CON ANOMALÍAS</span><strong>{mqtt.anomalyCount.toLocaleString('es-PE')}</strong><small>Informadas por los sensores</small></div><div><span>ÚLTIMA RECEPCIÓN</span><strong className="time-stat">{mqtt.lastAt === null ? 'Sin datos' : time(mqtt.lastAt)}</strong><small>{age === null ? 'Esperando mensajes' : `Hace ${age} s · hora del navegador`}</small></div></div>

        {view === 'overview' && <>
          <div className="overview-grid">
            <section className="panel trends-panel"><div className="panel-heading"><div><span className="eyebrow">EXPLORAR MEDICIONES</span><h2>Tendencia de la sesión</h2></div><span className="pill"><Activity size={12} /> MQTT</span></div><div className="chart-controls"><label>Sensor<select value={chartType} onChange={e => { const s = sensorByType(e.target.value)!; setChartType(s.type); setChartKey(s.primary); }} >{sensors.map(s => <option key={s.type} value={s.type}>{s.label} · {s.model}</option>)}</select></label><label>Medición<select value={chartField.key} onChange={e => setChartKey(e.target.value)}>{chartSensor.fields.filter(f => f.key !== 'nivel').map(f => <option key={f.key} value={f.key}>{f.label}</option>)}</select></label><label>Ventana<select value={windowMinutes} onChange={e => setWindowMinutes(e.target.value)}><option value="all">Toda la sesión</option><option value="5">Últimos 5 minutos</option><option value="15">Últimos 15 minutos</option><option value="60">Última hora</option></select></label></div><Chart key={`${chartType}-${chartKey}-${windowMinutes}`} messages={chartMessages} field={chartField} onOpen={m => setSelection({ type: chartType, field: chartField.key, message: m })} /></section>
            <aside className="overview-side"><section className="panel gateway-panel"><div className="panel-heading"><h2><Radio size={17} /> Gateway</h2><span className="node-number">GW</span></div><div className="gateway-value"><span className={`gateway-dot ${gateway?.raw.trim() === 'online' ? 'online' : ''}`} />{gateway ? gateway.raw.trim() : 'Sin datos'}</div><p>Estado comunicado por el gateway.<br />Independiente de la conexión de esta web.</p><div className="gateway-meta"><span>Última recepción</span><strong>{gateway ? time(gateway.receivedAt) : 'Sin datos'}</strong></div><button className="text-button" onClick={() => setSelection({ type: 'gateway' })}>Inspeccionar mensaje <ArrowUpRight size={14} /></button></section><section className="session-card"><Clock3 size={20} /><h3>Una ventana a esta sesión</h3><p>Los gráficos empiezan al abrir la web. No hay historial guardado y los datos se pierden al recargar.</p><span>Inicio: {dateTime(mqtt.startedAt)}</span></section></aside>
          </div>

          <section className="measurements-section" aria-labelledby="measurements-title"><div className="section-heading"><div><span className="eyebrow">ESTADO ACTUAL DEL SALÓN</span><h2 id="measurements-title">Las mediciones, de cerca</h2></div><span className="muted desktop-only">Selecciona una medición para inspeccionarla <ArrowUpRight size={14} /></span></div>
            {groups.map((group, groupIndex) => <div className="measurement-group" key={group}><div className="group-label"><span>0{groupIndex + 1}</span><h3>{group}</h3><div /></div><div className="measurement-cards">{sensors.filter(s => s.group === group).flatMap(sensor => {
              const Icon = sensorIcons[sensor.type];
              const shownFields = sensor.type === 'ambiente' ? sensor.fields : sensor.type === 'luz' ? sensor.fields.slice(0, 2) : sensor.fields.filter(f => f.key === sensor.primary);
              const message = latest[sensor.type];
              return shownFields.map(field => {
                const value = message ? numberValue(message, field.key) : null;
                const received = message?.receivedAt;
                return <button className={`measurement-card ${message ? 'has-data' : ''}`} key={`${sensor.type}-${field.key}`} onClick={() => setSelection({ type: sensor.type, field: field.key })}><div className="measurement-top"><span className="sensor-icon"><Icon size={18} /></span><span>{sensor.model} <b>·</b> NODO {sensor.node}</span><ArrowUpRight size={15} /></div><h4>{field.label}</h4><div className={`measurement-value ${value === null ? 'no-data' : ''}`}>{value === null ? 'Sin datos' : field.key === 'puerta_abierta' && (value === 0 || value === 1) ? value === 0 ? 'Cerrada' : 'Abierta' : format(value)}{value !== null && <small>{field.key === 'puerta_abierta' ? `(${value})` : field.unit}</small>}</div><div className="measurement-bottom"><span>{received ? `Recibido ${time(received)}` : 'Esperando primera lectura'}</span><span>{message?.anomalies.length ? `${message.anomalies.length} anomalía(s) recibida(s)` : 'Ver detalle'}</span></div></button>;
              });
            })}</div></div>)}
          </section>
          <section className="pending-banner"><div className="pending-icon"><Box size={25} /></div><div><h3>El espacio físico está por definir</h3><p>Plano, zonas, límites de alerta y recomendaciones: <strong>Pendiente de definir</strong>.</p></div><button className="secondary-button" onClick={() => goto('pending')}>Ver pendientes <ArrowRight size={15} /></button></section>
        </>}

        {view === 'messages' && <section className="panel messages-panel"><div className="panel-heading"><div><span className="eyebrow">REGISTRO TEMPORAL</span><h2>Explorador de mensajes</h2></div><span className="pill">{filtered.length} encontrados</span></div><div className="filter-bar"><ListFilter size={18} /><label>Sensor<select value={sensorFilter} onChange={e => { setSensorFilter(e.target.value); setPage(0); }}><option value="all">Todos los sensores y gateway</option>{sensors.map(s => <option key={s.type} value={s.type}>{s.label} · Nodo {s.node}</option>)}<option value="gateway">Gateway</option><option value="errors">Mensajes con error</option></select></label><label>Anomalía recibida<select value={anomalyFilter} onChange={e => { setAnomalyFilter(e.target.value); setPage(0); }}><option value="all">Todas</option><option value="with">Con anomalías recibidas</option><option value="none">NINGUNA (campo recibido)</option>{anomalies.map(a => <option key={a} value={a}>{a}</option>)}</select></label><button className="text-button" onClick={() => { setSensorFilter('all'); setAnomalyFilter('all'); setPage(0); }}>Restablecer filtros</button></div>
          <p className="table-caption">Más recientes primero · se conservan hasta {config.maxMessages.toLocaleString('es-PE')} mensajes en memoria. {mqtt.total > config.maxMessages ? 'Se descartaron los más antiguos al alcanzar el límite.' : 'Sin almacenamiento persistente.'}</p><div className="table-scroll"><table className="messages-table"><thead><tr><th>Recepción local</th><th>Sensor / nodo</th><th>Secuencia</th><th>Anomalías / contenido</th><th>Detalle</th></tr></thead><tbody>{filtered.slice(currentPage * 25, (currentPage + 1) * 25).map(m => <tr key={m.id}><td><time>{time(m.receivedAt)}</time>{m.retained && <small className="field-key">Retenido por el broker</small>}</td><td><strong>{sensorByType(m.type)?.label ?? (m.type === 'gateway' ? 'Gateway' : m.type)}</strong><code className="field-key">{m.topic}</code></td><td>{displayValue(m.data?.seq)}</td><td>{m.kind === 'error' ? <span className="error-text">{m.error}</span> : m.kind === 'gateway' ? m.raw : m.anomalies.length ? <div className="tags">{m.anomalies.map(a => <span className="tag" key={a}>{a}</span>)}</div> : displayValue(m.data?.anomalias)}</td><td><button className="icon-button" aria-label={`Abrir mensaje ${m.id} de ${m.type}`} onClick={() => openMessage(m)}><ArrowUpRight size={17} /></button></td></tr>)}</tbody></table></div>{filtered.length === 0 && <div className="empty-state"><Database size={28} /><strong>{noMessages ? 'Sin datos' : 'No hay mensajes con estos filtros'}</strong><p>{noMessages ? 'Los mensajes aparecerán aquí cuando se reciban por MQTT.' : 'Selecciona otro sensor o anomalía para explorar la sesión.'}</p></div>}<div className="pagination"><span>Página {currentPage + 1} de {pages} · {mqtt.errors} error(es) recibidos en la sesión</span><div className="button-group"><button className="icon-button" aria-label="Página anterior" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={18} /></button><button className="icon-button" aria-label="Página siguiente" disabled={currentPage >= pages - 1} onClick={() => setPage(currentPage + 1)}><ChevronRight size={18} /></button></div></div></section>}

        {view === 'nodes' && <><section className="panel connection-details"><div className="panel-heading"><h2>Enlace de esta web</h2><span className={`status-badge ${mqtt.status}`}>{statusLabel}</span></div><dl className="message-meta"><div><dt>Broker configurado</dt><dd><code>{config.broker}</code></dd></div><div><dt>Suscripción</dt><dd><code>{config.topic}</code></dd></div><div><dt>Modo</dt><dd>Solo lectura · QoS 0 · sesión MQTT limpia</dd></div><div><dt>Reconexión</dt><dd>Cada 5 s · sin suscripciones duplicadas</dd></div></dl><div className="notice"><CircleHelp size={17} /><span>Broker público de pruebas. Cualquiera puede leer los tópicos. No envíes información sensible.</span></div></section><div className="section-heading"><h2>Recepción por sensor</h2><span className="muted">El tiempo sin datos no determina un estado del aula.</span></div><div className="nodes-grid">{sensors.map(s => { const m = latest[s.type]; const Icon = sensorIcons[s.type]; return <section className="panel node-card" key={s.type}><div className="panel-heading"><span className="sensor-icon"><Icon size={20} /></span><span className="node-number">NODO {s.node}</span></div><h3>{s.label}</h3><p>{s.model}</p><dl><div><dt>Última recepción</dt><dd>{m ? `Hace ${Math.max(0, Math.floor((mqtt.now - m.receivedAt) / 1000))} s` : 'Sin datos'}</dd></div><div><dt>Secuencia recibida</dt><dd>{displayValue(m?.data?.seq)}</dd></div><div><dt>Perdidos acumulados recibidos</dt><dd>{displayValue(m?.data?.perdidos)}</dd></div></dl><button className="text-button" onClick={() => setSelection({ type: s.type })}>Inspeccionar sensor <ArrowUpRight size={14} /></button></section>; })}</div></>}

        {view === 'pending' && <><div className="pending-grid">{[{ title: 'Plano del aula', icon: Box, text: 'No se ha definido la geometría ni la ubicación de los elementos.' }, { title: 'Zonas', icon: LayoutDashboard, text: 'No se han establecido zonas ni ubicaciones de sensores.' }, { title: 'Límites de alerta', icon: Waves, text: 'No hay umbrales definidos para clasificar las mediciones.' }, { title: 'Recomendaciones', icon: CircleHelp, text: 'No se han definido acciones, causas ni consecuencias.' }].map(item => <section className="panel pending-card" key={item.title}><item.icon size={28} strokeWidth={1.4} /><h2>{item.title}</h2><span className="pill">Pendiente de definir</span><p>{item.text}</p></section>)}</div><section className="panel reference-note"><h2>Referencia y alcance</h2><p>La organización de las mediciones sigue el dashboard compartido de Grafana: ocupación y puerta, calidad del aire, confort térmico, acústica e iluminación. Su título interno menciona L418; esta aplicación corresponde al aula L419 solicitada.</p><p>La demo recibe MQTT directamente en el navegador. No depende de Grafana ni de InfluxDB y no consulta el historial del dashboard.</p><a href="https://drive.google.com/file/d/1tLW-syzJFY_dUCO3AVNFs7dYW3u-Z-HW/view" target="_blank" rel="noreferrer">Abrir referencia de Grafana <ArrowUpRight size={14} /></a></section></>}

        <footer className="page-footer"><span><Box size={14} /> L419 · Gemelo digital</span><span>Broker público de pruebas · solo lectura · datos de sesión</span><span>Sin historial persistente</span></footer>
      </main>
    </div>
    {selection && <Detail selection={selection} messages={mqtt.messages} latest={latest[selection.type]} onChange={message => setSelection({ ...selection, message })} onClose={() => setSelection(null)} />}
  </div>;
}
