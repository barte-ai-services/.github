# Barte AI Services

A Barte é uma plataforma de pagamentos brasileira (Barte Soluções de Pagamento LTDA).
A **Barte AI Services** é a frente de inteligência artificial da empresa: uma plataforma
de IA agêntica que fica por cima das operações, extensível e orientada a contratos,
instalada e hiperpersonalizada por cliente.

Em vez de uma ferramenta única, a plataforma é um conjunto de módulos — borda de dados,
dados versionados, identidade, execução durável, front-ends compartilhados e um acervo de
agentes — que se combinam em cada instalação. O produto de IA é entregue sob a marca
[Guardia](https://tryguardia.ai).

## Mapa da plataforma

### Núcleo
- **[gatekeeper](https://github.com/barte-ai-services/gatekeeper)** — borda de dados do perímetro: proxy e controle de acesso (Envoy + gRPC/Protobuf), provisionado com Terraform.
- **[loom](https://github.com/barte-ai-services/loom)** — execução durável: workflows longos, agentes e aprovação humana, sobre Temporal.

### Dados
- **[chronicle](https://github.com/barte-ai-services/chronicle)** — plataforma de dados de um perímetro: coleta pelo gatekeeper, histórico versionado, ontologia e projeções.

### Identidade
- **[tessera](https://github.com/barte-ai-services/tessera)** — serviço de identidade da plataforma, construído sobre Keycloak.

### Experiência
- **[shell](https://github.com/barte-ai-services/shell)** — front-ends em Next.js (Multi-Zones), com auth, layout e navegação compartilhados.
- **[barte-ui-kit](https://github.com/barte-ai-services/barte-ui-kit)** — UI kit React sobre o barte-design-system: gráficos, dashboard e componentes de produto.

### Agentes
- **[guild](https://github.com/barte-ai-services/guild)** — o acervo de agentes e skills, o mesmo para todo cliente, implantado por instalação.

### Ferramentas e documentação
- **[barte-forge](https://github.com/barte-ai-services/barte-forge)** — harness de desenvolvimento da plataforma (fork do Ahrena Framework).
- **[barte-fde-plugins](https://github.com/barte-ai-services/barte-fde-plugins)** — plugins do Claude Code usados pelo time de FDE.
- **[barte-ai-platform](https://github.com/barte-ai-services/barte-ai-platform)** — documentação da Barte AI Platform.

---

Padrões da organização (labels, templates de issues/PRs, workflows reutilizáveis) vivem no
repositório [`.github`](https://github.com/barte-ai-services/.github).