export const config = Object.freeze({
  broker: import.meta.env.VITE_MQTT_BROKER?.trim() || 'wss://test.mosquitto.org:8081',
  topic: import.meta.env.VITE_MQTT_TOPIC?.trim() || 'utec/gemelo/grupo4_pitufo/#',
  maxMessages: 5000,
  chartMessages: 300,
});

export function configurationError(): string | null {
  try {
    const url = new URL(config.broker);
    if (url.protocol !== 'wss:') return 'El broker debe usar WebSocket seguro (wss://).';
    if (url.username || url.password) return 'Esta demo no admite credenciales en la URL.';
  } catch { return 'La URL del broker no es válida.'; }
  const levels = config.topic.split('/');
  if (!config.topic || config.topic.includes('\0') || levels.some((part, i) =>
    (part.includes('#') && (part !== '#' || i !== levels.length - 1)) ||
    (part.includes('+') && part !== '+'))) return 'El filtro de tópico MQTT no es válido.';
  return null;
}
