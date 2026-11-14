export type SensorType = 'termico' | 'magnetico' | 'co2' | 'gas' | 'ambiente' | 'audio' | 'luz';
export interface Field { key: string; label: string; unit: string }
export interface Sensor { type: SensorType; label: string; model: string; node: number; group: string; primary: string; fields: Field[] }
const field = (key: string, label: string, unit = ''): Field => ({ key, label, unit });

// Organización y nombres basados en el dashboard de Grafana; unidades del contrato MQTT.
export const sensors: Sensor[] = [
  { type: 'termico', label: 'Conteo de personas', model: 'MLX90640', node: 5, group: 'Ocupación y puerta', primary: 'ocupacion_est', fields: [field('ocupacion_est', 'Ocupación estimada', 'personas'), field('entradas', 'Entradas desde el envío anterior', 'personas'), field('salidas', 'Salidas desde el envío anterior', 'personas'), field('personas_en_vista', 'Personas en vista', 'personas'), field('cruces_dudosos', 'Cruces dudosos'), field('t_fondo', 'Temperatura de fondo', '°C'), field('t_max', 'Temperatura máxima', '°C'), field('calibrando', 'Calibrando', '0/1')] },
  { type: 'magnetico', label: 'Puerta', model: 'KY-024', node: 6, group: 'Ocupación y puerta', primary: 'puerta_abierta', fields: [field('puerta_abierta', 'Puerta abierta', '0/1'), field('aperturas', 'Aperturas desde el envío anterior'), field('seg_abierta', 'Tiempo abierta desde el envío anterior', 's'), field('campo_raw', 'Campo magnético (lectura ADC)')] },
  { type: 'co2', label: 'CO₂', model: 'MH-Z19', node: 1, group: 'Calidad del aire', primary: 'co2_ppm', fields: [field('co2_ppm', 'Concentración de CO₂', 'ppm'), field('delta_30s', 'Cambio en 30 segundos', 'ppm'), field('temp_c', 'Temperatura interna aproximada', '°C'), field('calentando', 'Calentando', '0/1'), field('nivel', 'Nivel recibido del sensor')] },
  { type: 'gas', label: 'Gas', model: 'MQ-2', node: 3, group: 'Calidad del aire', primary: 'rs_r0', fields: [field('rs_r0', 'Índice de gas Rs/R0'), field('v_ao', 'Salida analógica', 'V'), field('do_alarma', 'Alarma digital recibida', '0/1'), field('calentando', 'Calentando', '0/1')] },
  { type: 'ambiente', label: 'Ambiente', model: 'BME280', node: 7, group: 'Confort térmico', primary: 'temp_c', fields: [field('temp_c', 'Temperatura', '°C'), field('hum_pct', 'Humedad relativa', '%'), field('pres_hpa', 'Presión atmosférica', 'hPa')] },
  { type: 'audio', label: 'Audio', model: 'INMP441', node: 2, group: 'Acústica', primary: 'leq_db', fields: [field('leq_db', 'Leq (1 s)', 'dB SPL'), field('lmax_db', 'Nivel máximo', 'dB SPL'), field('pico_db', 'Pico', 'dB SPL'), field('base_db', 'Ruido de fondo', 'dB SPL'), field('freq_dom_hz', 'Frecuencia dominante', 'Hz'), field('tonal', 'Tonalidad', '0–1'), field('bloques_fuertes', 'Bloques fuertes'), field('calibrando', 'Calibrando', '0/1')] },
  { type: 'luz', label: 'Luz', model: 'BH1750', node: 4, group: 'Iluminación', primary: 'lux_mesa_est', fields: [field('lux_mesa_est', 'Luz sobre la mesa (estimada)', 'lux'), field('lux', 'Luz en el techo', 'lux'), field('lux_min', 'Iluminancia mínima', 'lux'), field('lux_max', 'Iluminancia máxima', 'lux'), field('luces_cambio', 'Cambio de luces', '−1/0/+1')] },
];
export const commonFields: Field[] = [field('nodo', 'Nodo'), field('mac', 'MAC'), field('seq', 'Secuencia'), field('ts', 'Hora UTC del gateway', 'ms Unix'), field('uptime_ms', 'Tiempo encendido', 'ms'), field('perdidos', 'Paquetes perdidos acumulados'), field('tipo', 'Tipo'), field('anomalias', 'Anomalías recibidas'), field('anom_bits', 'Bits de anomalía recibidos')];
export const groups = [...new Set(sensors.map(s => s.group))];
export const sensorByType = (type: string) => sensors.find(s => s.type === type);

export interface SessionMessage {
  id: number; topic: string; raw: string; receivedAt: number; retained: boolean;
  kind: 'sensor' | 'gateway' | 'error'; type: string; data: Record<string, unknown> | null;
  anomalies: string[]; error?: string;
}

export function parseMessage(topic: string, raw: string, receivedAt: number, id: number, retained: boolean): SessionMessage {
  const topicType = topic.split('/').at(-1) || 'desconocido';
  const base = { id, topic, raw, receivedAt, retained, type: topicType, data: null, anomalies: [] };
  if (topic.endsWith('/gateway/estado')) return { ...base, type: 'gateway', kind: 'gateway' };
  try {
    const value: unknown = JSON.parse(raw);
    if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('Se esperaba un objeto JSON de sensor.');
    const data = value as Record<string, unknown>;
    if (typeof data.tipo !== 'string') throw new Error('Falta el campo tipo de sensor.');
    if (data.tipo !== topicType) throw new Error('El campo tipo no coincide con el tópico recibido.');
    const anomalies = typeof data.anomalias === 'string' ? data.anomalias.split('|').map(a => a.trim()).filter(a => a && a !== 'NINGUNA') : [];
    return { ...base, kind: 'sensor', type: data.tipo, data, anomalies };
  } catch (error) {
    return { ...base, kind: 'error', error: error instanceof SyntaxError ? 'JSON malformado: no se pudo interpretar el mensaje.' : error instanceof Error ? error.message : 'Mensaje no válido.' };
  }
}

export const displayValue = (value: unknown): string => value === null ? 'Sin datos (null)' : value === undefined ? 'Sin datos' : typeof value === 'object' ? JSON.stringify(value) : String(value);
export const numberValue = (message: SessionMessage, key: string): number | null => {
  const value = message.data?.[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  if (key === 'co2_ppm' && (value === -1 || value === -2)) return null;
  return value;
};
export const time = (ms: number) => new Date(ms).toLocaleTimeString('es-PE', { hour12: false });
export const dateTime = (ms: number) => new Date(ms).toLocaleString('es-PE', { hour12: false });
export function sensorTime(data: Record<string, unknown> | null): string {
  if (!data || !('ts' in data)) return 'Sin hora del gateway';
  if (data.ts === null) return 'Sin hora sincronizada (ts: null)';
  return typeof data.ts === 'number' && Number.isFinite(data.ts) && Math.abs(data.ts) <= 8640000000000000 ? dateTime(data.ts) : 'Hora del gateway no válida';
}
