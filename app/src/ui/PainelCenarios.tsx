import { Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { consultaDiagnostico, useDefinirCenario } from '@/api/consultas';
import { CENARIOS, type Cenario } from '@/servidor';
import { Cartao, Texto } from './base';
import { cores, espaco, raio } from './tema';

/**
 * Painel da demonstração: escolhe como a "rede" vai se comportar e mostra quantas
 * cobranças o servidor realmente criou. É esse número que prova a idempotência.
 */
export function PainelCenarios() {
  const { data } = useQuery(consultaDiagnostico);
  const definir = useDefinirCenario();

  return (
    <Cartao estilo={{ gap: espaco(2) }}>
      <Texto variante="rotulo">Simular rede</Texto>
      {(Object.keys(CENARIOS) as Cenario[]).map((cenario) => {
        const ativo = data?.cenario === cenario;
        return (
          <Pressable
            key={cenario}
            accessibilityRole="radio"
            accessibilityState={{ checked: ativo }}
            onPress={() => definir.mutate(cenario)}
            style={{
              flexDirection: 'row', gap: espaco(2), alignItems: 'center',
              padding: espaco(2), borderRadius: raio,
              backgroundColor: ativo ? cores.surface2 : 'transparent',
            }}
          >
            <View style={{
              width: 14, height: 14, borderRadius: 7, borderWidth: 2,
              borderColor: ativo ? cores.primary : cores.borderStrong,
              backgroundColor: ativo ? cores.primary : 'transparent',
            }} />
            <Texto variante="legenda" style={{ flex: 1, color: ativo ? cores.foreground : cores.muted }}>
              {CENARIOS[cenario]}
            </Texto>
          </Pressable>
        );
      })}
      <Texto variante="legenda" accessibilityLiveRegion="polite">
        Cobranças criadas no servidor: <Texto variante="rotulo" style={{ color: cores.primary }}>{data?.cobrancas ?? 0}</Texto>
      </Texto>
    </Cartao>
  );
}
