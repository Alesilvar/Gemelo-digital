import { useId, useState } from 'react';
import { Activity, ArrowUpRight } from 'lucide-react';
import { numberValue, time, type Field, type SessionMessage } from './data';
import { config } from './config';

export default function Chart({ messages, field, onOpen }: { messages: SessionMessage[]; field: Field; onOpen: (message: SessionMessage) => void }) {
  const titleId = useId();
  const data = messages.slice(-config.chartMessages);
  const [chosenId, setChosenId] = useState<number | null>(null);
  const chosenIndex = Math.max(0, data.findIndex(m => m.id === chosenId));
  const index = chosenId !== null && data.some(m => m.id === chosenId) ? chosenIndex : data.length - 1;
  const selected = data[index];
  const values = data.map(m => numberValue(m, field.key));
  const valid = values.filter((v): v is number => v !== null);
  const min = valid.length ? Math.min(...valid) : 0;
  const max = valid.length ? Math.max(...valid) : 1;
  const pad = min === max ? Math.max(Math.abs(min) * 0.05, 1) : (max - min) * 0.12;
  const low = min - pad, high = max + pad;
  const first = data[0]?.receivedAt ?? 0;
  const last = data.at(-1)?.receivedAt ?? 1;
  const x = (i: number) => data.length === 1 ? 385 : 60 + (data[i].receivedAt - first) / Math.max(last - first, 1) * 650;
  const y = (v: number) => 170 - (v - low) / (high - low) * 140;
  let drawing = '';
  let gap = true;
  values.forEach((v, i) => {
    if (v === null) { gap = true; return; }
    drawing += `${gap ? 'M' : 'L'} ${x(i)} ${y(v)} `;
    gap = false;
  });
  return <div className="chart-content">
    {valid.length === 0 ? <div className="chart-empty"><Activity size={28} strokeWidth={1.3} /><strong>Sin datos</strong><span>El gráfico aparecerá al recibir valores numéricos de esta medición.</span></div> : <>
      <div className="chart-reading"><strong>{selected && numberValue(selected, field.key) !== null ? numberValue(selected, field.key)?.toLocaleString('es-PE', { maximumFractionDigits: 3 }) : 'Sin datos'}</strong><span>{field.unit}</span><small>{selected ? `Recepción ${time(selected.receivedAt)}` : ''}</small></div>
      <svg className="line-chart" viewBox="0 0 750 205" role="img" aria-labelledby={titleId}>
        <title id={titleId}>{field.label}. {valid.length} valores de la sesión actual. Eje horizontal: hora de recepción en el navegador; eje vertical: {field.unit || 'valor recibido'}.</title>
        {[0, 1, 2, 3].map(i => { const value = low + (high - low) * i / 3; return <g key={i}><line x1="60" y1={y(value)} x2="710" y2={y(value)} className="gridline" /><text x="48" y={y(value) + 4} textAnchor="end">{value.toLocaleString('es-PE', { maximumFractionDigits: 1 })}</text></g>; })}
        <path d={drawing} className="chart-line" />
        {values.map((v, i) => v !== null && <circle key={data[i].id} cx={x(i)} cy={y(v)} r={i === index ? 5 : 2} className={i === index ? 'point-selected' : 'point'} />)}
        <text x="60" y="197">{time(first)}</text><text x="710" y="197" textAnchor="end">{time(last)}</text>
      </svg>
    </>}
    {data.length > 0 && <div className="chart-explorer"><label htmlFor={titleId + '-range'}>Explorar mensajes <span>{index + 1} / {data.length}</span></label><input id={titleId + '-range'} type="range" min="0" max={data.length - 1} value={Math.max(0, index)} onChange={e => setChosenId(data[Number(e.target.value)].id)} /><button className="text-button" onClick={() => onOpen(selected)}>Ver mensaje <ArrowUpRight size={14} /></button></div>}
    <p className="chart-note">Sesión actual · eje de tiempo por recepción · hasta {config.chartMessages} mensajes recientes. Los valores ausentes dejan huecos.</p>
  </div>;
}
