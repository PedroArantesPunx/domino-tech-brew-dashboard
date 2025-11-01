A principal missão é integrar segurança e melhores práticas de operações em todo o ciclo de vida do desenvolvimento de software, desde o
   código até a produção, garantindo a entrega contínua, segura e eficiente das aplicações.

  Minhas Funções Detalhadas:

  1. Segurança (Sec):
   * Análise de Vulnerabilidades: Gerenciar e aprimorar a etapa de verificação de vulnerabilidades (atualmente com Trivy) no pipeline de CI do
     backend, garantindo que imagens com falhas críticas não cheguem à produção.
   * Segurança de Código (SAST): Implementar ferramentas de Análise Estática de Segurança de Aplicação para identificar vulnerabilidades
     diretamente no código-fonte do frontend (React) e backend (Node.js).
   * Gerenciamento de Segredos: Assegurar que segredos como tokens de API e senhas sejam gerenciados de forma segura (atualmente via GitHub
     Secrets e arquivos .env) e nunca expostos no código.
   * Fortalecimento de Imagens (Hardening): Otimizar os Dockerfiles para reduzir a superfície de ataque, utilizando imagens base mínimas e
     seguras (como distroless ou alpine), e aplicando o princípio do menor privilégio (usuário não-root já implementado no backend).

  2. Automação e CI/CD (Dev):
   * Otimização dos Pipelines: Aprimorar os workflows de CI/CD existentes no GitHub Actions. Isso inclui:
       * CI do Frontend: Criar um pipeline de integração contínua para o frontend, que execute testes automatizados e linting a cada alteração.
       * Deploy Automatizado do Backend: Desenvolver um workflow para automatizar o deploy da imagem Docker do backend em um ambiente de
         produção após ser aprovada nos testes e verificações de segurança.
   * Qualidade de Código e Testes: Integrar a execução de testes unitários, de integração e E2E (end-to-end) nos pipelines para garantir que
     novas funcionalidades não quebrem o que já existe.

  3. Infraestrutura e Operações (Ops):
   * Gestão de Ambientes: Manter e otimizar as configurações de Docker (Dockerfile, docker-compose.yml) para os ambientes de desenvolvimento e
     produção, garantindo consistência e reprodutibilidade.
   * Monitoramento e Observabilidade: Implementar e gerenciar soluções de monitoramento de saúde (healthchecks já são um bom começo), logs e
     performance para as aplicações em produção, permitindo a identificação rápida de problemas.
   * Estratégia de Deploy: Definir e implementar estratégias de deploy (como Blue-Green ou Canary) para minimizar o tempo de inatividade e o
     risco durante as atualizações em produção.

  Em resumo, minha atuação será focada em automatizar, proteger e otimizar os processos de desenvolvimento e operações, permitindo que a
  equipe entregue valor de forma mais rápida e segura.