import { useEffect, useReducer, useState } from 'react';
import mqtt, { type MqttClient } from 'mqtt';
import { config, configurationError } from './config';
import { parseMessage, type SessionMessage } from './data';

export type ConnectionState = 'conectando' | 'conectado' | 'reconectando' | 'desconectado';
interface Session { messages: SessionMessage[]; latest: Record<string, SessionMessage>; total: number; errors: number; anomalyCount: number; lastAt: number | null }
const initial: Session = { messages: [], latest: {}, total: 0, errors: 0, anomalyCount: 0, lastAt: null };
function receive(state: Session, message: SessionMessage): Session {
  return {
    messages: [...state.messages.slice(-(config.maxMessages - 1)), message],
    latest: message.kind === 'error' ? state.latest : { ...state.latest, [message.topic]: message },
    total: state.total + 1, errors: state.errors + Number(message.kind === 'error'),
    anomalyCount: state.anomalyCount + Number(message.anomalies.length > 0), lastAt: message.receivedAt,
  };
}

export function useMqtt() {
  const [session, dispatch] = useReducer(receive, initial);
  const [status, setStatus] = useState<ConnectionState>('conectando');
  const [problem, setProblem] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [startedAt] = useState(Date.now);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let disposed = false;
    let client: MqttClient | undefined;
    const error = configurationError();
    if (!enabled || error) {
      setStatus('desconectado'); setProblem(error);
      return;
    }
    setStatus('conectando'); setProblem(null);
    try {
      client = mqtt.connect(config.broker, {
        manualConnect: true, clean: true, resubscribe: false,
        reconnectPeriod: 5000, connectTimeout: 15000, keepalive: 30,
        clientId: `l419_web_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`,
      });
      const active = client;
      active.on('connect', () => {
        if (disposed) return;
        setProblem(null);
        // clean=true + resubscribe=false: una sola suscripción explícita por conexión.
        active.subscribe(config.topic, { qos: 0 }, (err, granted) => {
          if (disposed || !active.connected) return;
          if (err || !granted?.length || granted.some(g => g.qos > 2)) {
            setStatus('desconectado');
            setProblem(`El broker no aceptó la suscripción${err ? `: ${err.message}` : '.'}`);
            active.end(true);
          } else { setStatus('conectado'); setProblem(null); }
        });
      });
      active.on('message', (topic, payload, packet) => {
        if (!disposed) dispatch(parseMessage(topic, payload.toString(), Date.now(), nextMessageId++, packet.retain));
      });
      active.on('reconnect', () => { if (!disposed) setStatus('reconectando'); });
      active.on('close', () => {
        if (!disposed) {
          setStatus('desconectado');
          setProblem(previous => previous || 'No hay conexión con el broker. Se reintentará automáticamente cada 5 s.');
        }
      });
      active.on('error', err => {
        if (!disposed) setProblem(err.message === 'connack timeout'
          ? 'El broker no respondió a la conexión MQTT en 15 s. Se reintentará automáticamente.'
          : `Error MQTT: ${err.message || 'No se pudo establecer la conexión segura.'}`);
      });
      active.connect();
    } catch (err) {
      setStatus('desconectado');
      setProblem(err instanceof Error ? err.message : 'No se pudo iniciar MQTT.');
    }
    return () => {
      disposed = true;
      client?.removeAllListeners();
      client?.end(true);
    };
  }, [enabled, attempt]);

  return { ...session, status, problem, enabled, startedAt, now,
    toggle: () => setEnabled(value => !value),
    retry: () => { setEnabled(true); setAttempt(value => value + 1); },
  };
}

let nextMessageId = 1;
