# Atendimento por WhatsApp e valor negociado — 03/10/2026

O aviso “Limite de envios atingido” vinha da RPC `submit_lead`: um envio por telefone por minuto, cinco por hora, além de limites globais de 30/minuto e 500/dia. Não é evidência de cota do plano Supabase ou Vercel.

Os formulários públicos agora preparam a mensagem no navegador e abrem `wa.me`, sem gravar uma proposta nem depender dessa RPC. O cliente confirma o envio no WhatsApp. Não há API de envio automático nem confirmação de entrega. Os contatos antigos e suas permissões continuam disponíveis no painel. A RPC antiga mantém sua proteção contra abuso para acessos diretos.

Em **WhatsApp e redes**, `settings.write` permite editar o número geral e números específicos para financiamento, interesse no estoque e venda/troca do veículo do cliente. Número específico vazio usa o geral. Se ambos estiverem vazios, o site informa indisponibilidade. As configurações públicas têm cache de 60 segundos e são invalidadas ao salvar.

Em **Vendas**, `stock.read` permite consultar e `stock.write` permite registrar/corrigir o valor efetivo. A tela permite buscar o estoque em páginas de 12. Registrar venda marca o veículo como vendido atomicamente e remove o anúncio público. Um veículo ainda não vendido exige confirmação explícita na tela.

O valor real fica em `vehicle_sales`, tabela privada com RLS. Não muda o preço anunciado nem o snapshot `sold_advertised_price`. Não se inventa valor para vendidos antigos. Os gráficos existentes continuam explicitamente baseados em preços anunciados; esta entrega não converte tais indicadores em faturamento ou lucro. Reabrir o veículo remove o valor negociado anterior; excluir o veículo remove a relação. Não constitui livro contábil permanente.

## Publicação

1. Aplicar `supabase/migrations/202610030001_whatsapp_sales.sql` ao mesmo projeto usado pela Vercel, antes de publicar o frontend. A migração é aditiva e preserva números, anúncios e contatos existentes.
2. Publicar este commit na Vercel com as variáveis públicas já configuradas.
3. No painel, preencher os destinos e salvar. Campos específicos vazios mantêm o destino geral anterior.
4. Conferir financiamento, interesse, venda/troca e contato; o envio final acontece no WhatsApp.

Não usar o link desatualizado `testecar.vercel.app` do cadastro do GitHub como prova de publicação. Na inspeção ele retornou `DEPLOYMENT_NOT_FOUND`; os deployments encontrados no histórico exigiam login Vercel.

## Validação

Testes unitários cobrem roteamento, fallback, consentimento, validação e pedidos repetidos sem limite. Testes PostgreSQL isolados cobrem RLS, destino administrativo, valor negociado, preservação do anúncio, correção, reabertura e rejeição de valor inválido por API direta. Não enviam mensagens reais nem alteram anúncios reais.

Resultado da entrega: 84 testes unitários/PostgreSQL e 10 testes de navegador passaram; TypeScript, ESLint e build de produção passaram. As páginas públicas e novas telas administrativas foram verificadas em 320, 375, 390, 430, 768 e 1440px, sem overflow e sem violações nas verificações automatizadas de acessibilidade executadas.

A migração foi aplicada ao projeto Supabase vinculado `veiculos` em 03/10/2026. `tests/live-whatsapp-sales.cjs` confirmou login real, registro/correção de venda com centavos, preservação do preço anunciado, limpeza ao reabrir e abertura do destino configurado de financiamento sem Server Action. A navegação para WhatsApp foi interceptada pelo teste, sem envio de mensagem. Conta e veículo QA foram removidos em `finally`. Nenhum número da loja foi alterado.
