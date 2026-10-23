import { PaginaLegal, SecaoLegal } from "@/components/pagina-legal";

export const metadata = { title: "Política de privacidade | Plataforma Spitz Alemão" };

const CONTATO = process.env.NEXT_PUBLIC_CONTATO_EMAIL ?? "contato@seudominio.com.br";

export default function PrivacidadePage() {
  return (
    <PaginaLegal titulo="Política de privacidade" atualizado="outubro de 2026">
      <SecaoLegal titulo="1. Quem somos">
        <p>
          A Plataforma Spitz Alemão é a controladora dos dados tratados neste serviço, nos termos da Lei Geral de
          Proteção de Dados (LGPD, Lei 13.709/2018). Contato do encarregado:{" "}
          <a className="underline" href={`mailto:${CONTATO}`}>
            {CONTATO}
          </a>
          .
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="2. Quais dados coletamos">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Cadastro:</strong> nome, e-mail, senha (guardada apenas de forma criptografada) e tipo de conta.
          </li>
          <li>
            <strong>Criadores:</strong> dados do canil, plantel, financeiro, ninhadas, cuidados, anúncios e vendas
            registradas (inclusive o preço final).
          </li>
          <li>
            <strong>Compradores no Radar:</strong> preferências (porte, cor, faixa de preço, estado), WhatsApp e, se
            informado, CPF — usados para validação anti-fraude.
          </li>
          <li>
            <strong>Uso do marketplace:</strong> visualizações de anúncios, buscas com filtros e favoritos. Para
            visitantes sem conta, usamos apenas um identificador aleatório guardado no navegador, sem nome nem
            contato.
          </li>
        </ul>
      </SecaoLegal>

      <SecaoLegal titulo="3. Para que usamos">
        <ul className="list-disc pl-5 space-y-1">
          <li>Operar a conta, o marketplace e os pagamentos.</li>
          <li>Validar compradores e prevenir fraudes e spam.</li>
          <li>
            Gerar estatísticas <strong>agregadas</strong> de mercado (demanda por cor e região, preços reais de venda,
            tempo para vender) que alimentam as sugestões de preço. Nelas, ninguém é identificado.
          </li>
          <li>Enviar avisos do serviço (mensagens recebidas, cio, vacinas, aprovações).</li>
        </ul>
      </SecaoLegal>

      <SecaoLegal titulo="4. Com quem compartilhamos">
        <p>
          O contato de um comprador (WhatsApp e e-mail) só é revelado a um criador quando <strong>ambos aceitam</strong>{" "}
          o contato e o cadastro do comprador foi validado. Não vendemos dados pessoais. Usamos prestadores de
          infraestrutura (hospedagem, banco de dados, armazenamento de arquivos, e-mail e pagamentos — Mercado Pago)
          que tratam dados apenas para nos prestar o serviço.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="5. Seus direitos">
        <p>
          Você pode pedir confirmação do tratamento, acesso, correção, anonimização, portabilidade e exclusão dos seus
          dados, além de revogar consentimentos, escrevendo para{" "}
          <a className="underline" href={`mailto:${CONTATO}`}>
            {CONTATO}
          </a>
          . Dados necessários para cumprir obrigações legais (como registros de pagamentos) podem ser mantidos pelo
          prazo exigido em lei.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="6. Segurança e retenção">
        <p>
          Adotamos medidas técnicas para proteger os dados (conexão criptografada, senhas com hash, controle de
          acesso por perfil). Mantemos os dados enquanto a conta estiver ativa; estatísticas agregadas podem ser
          mantidas de forma anonimizada.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="7. Crianças e adolescentes">
        <p>O serviço é destinado a maiores de 18 anos.</p>
      </SecaoLegal>
    </PaginaLegal>
  );
}
