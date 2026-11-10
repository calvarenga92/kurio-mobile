import { useState } from 'react';
import { Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { consultaCarrinho } from '@/api/consultas';
import { Texto } from '@/ui/base';
import { cores, fonteMono } from '@/ui/tema';

function AtalhoCarrinho() {
  const router = useRouter();
  const { data } = useQuery(consultaCarrinho);
  const quantidade = data?.itens.reduce((acc, i) => acc + i.quantidade, 0) ?? 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Carrinho, ${quantidade} itens`}
      onPress={() => router.push('/carrinho')}
      hitSlop={12}
    >
      <Texto variante="rotulo" style={{ color: cores.primary }}>Carrinho ({quantidade})</Texto>
    </Pressable>
  );
}

export default function Layout() {
  /** Sem retry automático em mutação: quem decide reenviar o pagamento é o usuário, com a mesma chave. */
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 5_000 }, mutations: { retry: false } },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: cores.ink },
          headerTintColor: cores.foreground,
          headerTitleStyle: { fontFamily: fonteMono, fontWeight: '700' },
          contentStyle: { backgroundColor: cores.ink },
          headerRight: () => <AtalhoCarrinho />,
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Kurio' }} />
        <Stack.Screen name="nft/[id]" options={{ title: 'Detalhe' }} />
        <Stack.Screen name="carrinho" options={{ title: 'Carrinho', headerRight: () => null }} />
        <Stack.Screen name="pagamento" options={{ title: 'Pagamento', headerRight: () => null }} />
        <Stack.Screen name="pedido/[id]" options={{ title: 'Recibo', headerRight: () => null }} />
      </Stack>
    </QueryClientProvider>
  );
}
