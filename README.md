# Alias de Chamados

Extensão para Chrome, Edge e Brave que substitui atalhos digitados em campos de texto por mensagens prontas. Com o Supabase configurado, os aliases ficam sincronizados por usuário.

## Configuração do login

1. Crie um projeto no Supabase.
2. No SQL Editor, execute o conteúdo de [supabase-schema.sql](./supabase-schema.sql).
3. Copie [config.example.js](./config.example.js) para `config.js`.
4. Em `config.js`, preencha a URL do projeto e a chave pública anon/publishable. Não use a chave `service_role`.
5. Recarregue a extensão em `chrome://extensions`.

O login usa e-mail e senha. Dependendo da configuração de confirmação de e-mail do projeto, será necessário confirmar o e-mail antes do primeiro acesso.

## Instalação

1. Abra `chrome://extensions` (no Edge, `edge://extensions`).
2. Ative o **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação**.
4. Selecione esta pasta do projeto.

## Uso

Abra o popup da extensão e cadastre um atalho, sempre começando com hífen, por exemplo `-bd`.
Em um campo de chamado, digite o atalho e pressione espaço, Enter ou Tab. O texto será substituído automaticamente.

Para editar, clique no ícone de lápis ao lado do alias, altere o atalho ou a mensagem e clique em **Salvar alteração**. Use **Cancelar edição** para sair sem salvar.

Já vêm cadastrados:

- `-bd` — Olá, bom dia! Irei realizar seu atendimento.
- `-bt` — Olá, boa tarde! Irei realizar seu atendimento.
- `-bn` — Olá, boa noite! Irei realizar seu atendimento.

Os aliases ficam salvos apenas no armazenamento local do navegador.
