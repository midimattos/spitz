import { PaginaLegal, SecaoLegal } from "@/components/pagina-legal";

export const metadata = { title: "Termos de uso | Plataforma Spitz Alemão" };

const CONTATO = process.env.NEXT_PUBLIC_CONTATO_EMAIL ?? "contato@seudominio.com.br";

export default function TermosPage() {
  return (
    <PaginaLegal titulo="Termos de uso" atualizado="outubro de 2026">
      <SecaoLegal titulo="1. O que é a plataforma">
        <p>
          A Plataforma Spitz Alemão reúne duas coisas: um sistema de gestão para canis (cadastro de cães, genealogia,
          financeiro, ninhadas, cuidados e precificação) e um marketplace onde canis verificados anunciam filhotes e
          compradores encontram o que procuram.
        </p>
        <p>
          A plataforma é uma intermediária de contato. Ela <strong>não é parte</strong> na compra e venda dos animais:
          o negócio é fechado diretamente entre criador e comprador, que respondem por ele.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="2. Cadastro e verificação">
        <p>
          Você deve informar dados verdadeiros. Canis passam por verificação (ou entram por convite de um canil já
          verificado) antes de aparecer no marketplace. O selo &quot;Canil verificado&quot; indica que a equipe conferiu
          os dados cadastrais do canil; <strong>não é certificação de saúde, de genética ou de qualidade</strong> dos
          animais.
        </p>
        <p>
          Compradores que usam o Radar de Demanda passam por validação antes de seus dados de contato serem liberados a
          um criador. A plataforma pode aprovar, rejeitar ou suspender cadastros para proteger a comunidade contra
          fraudes.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="3. Responsabilidades do criador">
        <ul className="list-disc pl-5 space-y-1">
          <li>Anunciar apenas animais que realmente possui, com informações e fotos verdadeiras.</li>
          <li>Cumprir a legislação aplicável à criação e venda de animais e garantir o bem-estar dos animais.</li>
          <li>Informar o preço final real ao marcar uma venda — esses dados alimentam as estimativas de mercado.</li>
          <li>Não usar a plataforma para contornar a comissão devida sobre vendas realizadas por meio dela.</li>
        </ul>
      </SecaoLegal>

      <SecaoLegal titulo="4. Responsabilidades do comprador">
        <ul className="list-disc pl-5 space-y-1">
          <li>Informar dados verdadeiros e usar o contato dos criadores apenas para a negociação do animal.</li>
          <li>Verificar, antes de pagar, as condições do animal, a documentação e o contrato com o criador.</li>
          <li>Não enviar mensagens abusivas, spam ou tentar golpes.</li>
        </ul>
      </SecaoLegal>

      <SecaoLegal titulo="5. Estimativas de preço, genética e mercado">
        <p>
          Os preços sugeridos, as análises de mercado e o simulador de cruzamento são <strong>estimativas</strong>
          calculadas a partir de dados da própria plataforma e de regras genéticas gerais. Podem estar incompletas ou
          imprecisas, principalmente enquanto há poucos dados, e não substituem exame de DNA, avaliação veterinária
          nem o seu julgamento. Decisões de preço e de reprodução são sempre do criador.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="6. Planos, pagamentos e comissão">
        <p>
          Alguns recursos são gratuitos e outros pagos (assinatura PRO, destaque de anúncio) ou geram comissão sobre
          vendas. Os valores vigentes são exibidos no momento da contratação. Pagamentos são processados pelo Mercado
          Pago; a plataforma não armazena dados de cartão.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="7. Conteúdo e moderação">
        <p>
          Você mantém a titularidade do que publica e autoriza a plataforma a exibi-lo para operar o serviço. Anúncios,
          avaliações e mensagens que violem estes termos, a lei ou direitos de terceiros podem ser removidos, e contas
          podem ser suspensas.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="8. Limitação de responsabilidade">
        <p>
          A plataforma é oferecida &quot;como está&quot;. Na máxima extensão permitida em lei, não nos responsabilizamos
          por negociações entre usuários, pela veracidade das informações que usuários publicam, nem por perdas
          decorrentes de decisões tomadas com base nas estimativas apresentadas.
        </p>
      </SecaoLegal>

      <SecaoLegal titulo="9. Alterações e contato">
        <p>
          Podemos atualizar estes termos; mudanças relevantes serão comunicadas na plataforma. Dúvidas:{" "}
          <a className="underline" href={`mailto:${CONTATO}`}>
            {CONTATO}
          </a>
          .
        </p>
      </SecaoLegal>
    </PaginaLegal>
  );
}
